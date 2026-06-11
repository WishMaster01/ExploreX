import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { auth } from "@clerk/nextjs/server";
import {
  apiError,
  apiOk,
  isRecord,
  nonEmptyString,
  readJsonObject,
  serverError,
} from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "openai/gpt-4.1-mini";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;

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
Also, suggest an itinerary with: place_name, place_details, place_image_url, geo coordinates, place_address, ticket_pricing, time_travel_each_location, and best_time_to_visit.
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
            "time_travel_each_location": "string",
            "best_time_to_visit": "string"
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
      content: message.content.trim().slice(0, MAX_MESSAGE_CHARS),
    } satisfies ChatCompletionMessageParam;
  });

  if (messages.some((message) => message === null)) {
    return null;
  }

  return messages as ChatCompletionMessageParam[];
}

export async function POST(req: Request) {
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

    const openai = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: body?.isFinal === true ? FINAL_PROMPT : PROMPT,
        },
        ...messages,
      ],
      model: MODEL,
      response_format: { type: "json_object" },
    });

    const rawMessage = completion.choices?.[0]?.message?.content?.trim();

    if (!rawMessage) {
      return apiError("AI returned an empty response", 502, "SERVICE_UNAVAILABLE");
    }

    try {
      return apiOk(JSON.parse(rawMessage));
    } catch {
      console.error("AI returned invalid JSON");
      return apiError("AI returned invalid JSON", 502, "SERVICE_UNAVAILABLE");
    }
  } catch (error) {
    return serverError(error, "Error generating AI response");
  }
}
