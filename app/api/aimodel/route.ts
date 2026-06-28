import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import {
  apiError,
  apiOk,
  isRecord,
  nonEmptyString,
  readJsonObject,
  serverError,
} from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { chatResponseSchema, finalResponseSchema } from "@/lib/ai-schemas";
import { AsyncRequestQueue, withExponentialBackoff } from "@/lib/async-request-queue";
import { LruTtlCache } from "@/lib/algorithms/cache/lru-ttl-cache";
import { safeJsonParse } from "@/lib/algorithms/validation/safe-json-parser";
import { optimizeTripPlan } from "@/lib/trip-optimizer";
import { prisma } from "@/lib/db";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "openai/gpt-4.1-mini";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const aiQueue = new AsyncRequestQueue(3, 75);
const responseCache = new LruTtlCache<unknown>(100, 30 * 60_000);

const PROMPT = `You are an AI Trip Planner Agent. Your goal is to help the user plan a trip by asking one relevant trip-related question at a time.
Only ask questions about the following details in order, and wait for the user's answer before asking the next:
1. Starting location(source)
2. Destination city or country
3. Group size (Solo, Couple, Family, Friends)
4. Budget (Low, Medium, or High)
5. Trip duration (number of days)
6. Travel interests (eg., Adventure, Relaxation, Culture, Food, Nightlife, Sightseeing, Shopping, Nature)
7. Special requirements or preferences (if any)
Do not ask multiple questions at once, and never ask irrelevant questions.
If any answer is missing or unclear, politely ask the user to clarify before proceeding.
Always maintain a conversational, interactive style while asking questions.
Along with response, also send which ui component to display for generative UI for example (budget/groupSize/tripDuration/final), where Final means AI generating complete final output.
Use ui "default" when asking free-text questions such as travel interests or special requirements.
Do not repeat a question that the user has already answered in the conversation.
After the user provides trip duration, do not return ui "tripDuration" again.
Once all required information is collected, generate and return a strict JSON response only (no explanations or extra text) with following JSON schema:
{
  "resp": "Text Resp",
  "ui": "(default/budget/groupSize/tripDuration/final)"
}
`;

const FINAL_PROMPT = `Generate a Travel Plan with the given details.
Provide a Hotels options list with: hotel_name, hotel_address, price_per_night, hotel_image_url, geo coordinates, rating, description.
Also, suggest an itinerary with: place_name, place_details, place_image_url, geo coordinates, place_address, ticket_pricing, estimated_cost, time_travel_each_location, best_time_to_visit, opening_time, closing_time, and visit_duration_minutes.
For hotel_image_url and place_image_url, return an empty string if you do not know a real direct image URL. Do not invent placeholder URLs, example.com URLs, or web page URLs.
Return the result strictly in JSON format matching the schema below:

{
  "trip_plan": {
    "destination": "string",
    "duration": "string",
    "origin": "string",
    "budget": "string",
    "group_size": "string",
    "hotels": [
      {
        "hotel_name": "string",
        "hotel_address": "string",
        "price_per_night": "string",
        "hotel_image_url": "string",
        "geo_coordinates": {
          "latitude": "number",
          "longitude": "number"
        },
        "rating": "number",
        "description": "string"
      }
    ],
    "itinerary": [
      {
        "day": "number",
        "day_plan": "string",
        "best_time_to_visit_day": "string",
        "activities": [
          {
            "place_name": "string",
            "place_details": "string",
            "place_image_url": "string",
            "geo_coordinates": {
              "latitude": "number",
              "longitude": "number"
            },
            "place_address": "string",
            "ticket_pricing": "string",
            "estimated_cost": "number",
            "time_travel_each_location": "string",
            "best_time_to_visit": "string",
            "opening_time": "HH:MM",
            "closing_time": "HH:MM",
            "visit_duration_minutes": "number"
          }
        ]
      }
    ]
  }
}
`;

function normalizeMessages(value: unknown): ChatCompletionMessageParam[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return null;
  }

  const messages = value.map((message) => {
    if (!isRecord(message) || !nonEmptyString(message.content)) {
      return null;
    }

    const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;

    if (!role) {
      return null;
    }

    return {
      role,
      content: message.content
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s{3,}/g, "  ")
        .trim()
        .slice(0, MAX_MESSAGE_CHARS),
    } satisfies ChatCompletionMessageParam;
  });

  if (messages.some((message) => message === null)) {
    return null;
  }

  return messages as ChatCompletionMessageParam[];
}

function retryableProviderError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  return status === 0 || status === 408 || status === 409 || status === 429 || status >= 500;
}

function cacheKey(userId: string, messages: ChatCompletionMessageParam[]) {
  return createHash("sha256")
    .update(`${userId}:${JSON.stringify(messages)}`)
    .digest("hex");
}

export async function POST(req: Request) {
  let finalRequest = false;
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return apiError("AI provider is not configured", 503, "SERVICE_UNAVAILABLE");
    }

    const body = await readJsonObject(req);

    if (!body) {
      return apiError("Request body must be a JSON object", 400, "BAD_REQUEST");
    }

    const messages = normalizeMessages(body?.messages);

    if (!messages) {
      return apiError("messages must be a non-empty array of user/assistant messages", 400, "BAD_REQUEST");
    }

    const rateLimitResponse = await enforceRateLimit(req, {
      capacity: body.isFinal === true ? 5 : 30,
      interval: 3600,
      refillRate: body.isFinal === true ? 2 : 15,
      requested: body.isFinal === true ? 2 : 1,
      userId,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const isFinal = body.isFinal === true;
    finalRequest = isFinal;
    const key = isFinal ? cacheKey(userId, messages) : "";
    const cached = isFinal ? await responseCache.get(key) : undefined;
    if (cached) {
      return apiOk(cached);
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
    });

    const parsed = await aiQueue.run(() =>
      withExponentialBackoff(async () => {
        const completion = await openai.chat.completions.create({
          max_tokens: isFinal ? 6000 : 1000,
          messages: [
            { role: "system", content: isFinal ? FINAL_PROMPT : PROMPT },
            ...messages,
          ],
          model: MODEL,
          response_format: { type: "json_object" },
        });
        const rawMessage = completion.choices?.[0]?.message?.content?.trim();
        if (!rawMessage) throw new Error("AI returned an empty response");
        if (isFinal) {
          const result = safeJsonParse(rawMessage, finalResponseSchema);
          if (!result.data) throw new Error(`AI response validation failed: ${result.error}`);
          return { kind: "final" as const, data: result.data };
        }
        const result = safeJsonParse(rawMessage, chatResponseSchema);
        if (!result.data) throw new Error(`AI response validation failed: ${result.error}`);
        return { kind: "chat" as const, data: result.data };
      }, { retries: 2, shouldRetry: retryableProviderError }),
    );

    const response = parsed.kind === "final"
      ? { trip_plan: optimizeTripPlan(parsed.data.trip_plan) }
      : parsed.data;
    if (isFinal) await responseCache.set(key, response);
    if (isFinal) {
      void prisma.analyticsEvent.create({
        data: { type: "ai_generation", success: true, destination: response && "trip_plan" in response ? response.trip_plan.destination : null },
      }).catch((analyticsError) => console.error("Unable to record AI analytics", analyticsError));
    }
    return apiOk(response);
  } catch (error) {
    if (error instanceof Error && error.message === "AI request queue is full") {
      return apiError("AI service is busy; try again shortly", 503, "SERVICE_UNAVAILABLE");
    }
    void prisma.analyticsEvent.create({
      data: { type: "ai_generation", success: false },
    }).catch((analyticsError) => console.error("Unable to record failed AI analytics", analyticsError));
    if (!finalRequest) {
      return apiOk({
        resp: "I could not process that answer reliably. Please rephrase the last trip detail.",
        ui: "default",
      });
    }
    return serverError(error, "Error generating AI response");
  }
}
