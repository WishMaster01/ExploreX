"use client";

import { AIThinking } from "@/components/travel/TravelUI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTripPlan } from "@/context/TripPlanContext";
import type { TripInfo } from "@/lib/types/trip";
import { withGeneratedTripImages } from "@/lib/trip-transform";
import axios from "axios";
import { Bot, MapPin, MapPinned, Send, Sparkles, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import BudgetUI from "./BudgetUI";
import EmptyBoxState from "./EmptyBoxState";
import FinalUI from "./FinalUI";
import GroupSizeUI from "./GroupSizeUI";
import TripDurationUI from "./TripDurationUI";

type Message = {
  role: string;
  content: string;
  ui?: string;
};

type DestinationSuggestion = {
  label: string;
  city: string;
  country: string;
  state?: string;
};

const ChatBox = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isFinal, setIsFinal] = useState<boolean>(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);

  const { tripReady, setTripDetails, setTripLoading, scrollToItinerary } =
    useTripPlan();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seededDestinationRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const lastAssistantWithUiIndex = messages.findLastIndex(
    (message) => message.role === "assistant" && Boolean(message.ui),
  );
  const lastAssistant = messages.findLast((message) => message.role === "assistant");
  const expectsDestination = Boolean(
    lastAssistant && /destination|where (?:do you|would you).*travel|city or country/i.test(lastAssistant.content),
  );
  const showDestinationSuggestions = expectsDestination && userInput.trim().length >= 2 && destinationSuggestions.length > 0;

  useEffect(() => {
    if (!expectsDestination || userInput.trim().length < 2 || loading) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/destinations?q=${encodeURIComponent(userInput.trim())}&limit=6`, {
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : { suggestions: [] })
        .then((data) => setDestinationSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []))
        .catch((error) => {
          if (error instanceof Error && error.name !== "AbortError") setDestinationSuggestions([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [expectsDestination, loading, userInput]);

  const shouldRenderGenerativeUI = (message: Message, index: number) => {
    if (!message.ui || index !== lastAssistantWithUiIndex || loading) {
      return false;
    }

    const content = message.content.toLowerCase();

    if (message.ui === "tripDuration") {
      return /day|duration|how long|how many/.test(content);
    }

    if (message.ui === "groupSize") {
      return /solo|couple|family|friends|group|traveling/.test(content);
    }

    if (message.ui === "budget") {
      return /budget|low|medium|high|cost/.test(content);
    }

    return message.ui === "final";
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const onSend = async (overrideText?: string) => {
    const outboundText = (overrideText ?? userInput).trim();
    if (!outboundText || loading) return;

    const newMessage: Message = {
      role: "user",
      content: outboundText,
    };

    const nextMessages = [...messages, newMessage];
    setMessages(nextMessages);
    setUserInput("");
    setLoading(true);
    if (isFinal) setTripLoading(true);

    try {
      const result = await axios.post("/api/aimodel", {
        messages: nextMessages,
        isFinal,
      });

      let respText = "";
      let uiType = "default";
      let tripPlan: TripInfo | undefined;

      if (typeof result.data === "string") {
        respText = result.data;
      } else if (result.data) {
        respText = result.data.resp || result.data.text || "";
        uiType = result.data.ui || "default";
        tripPlan = result.data.trip_plan;
      }

      if (!isFinal) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: respText || "I need one more detail to build your trip.",
            ui: uiType,
          },
        ]);
      }

      if (isFinal && tripPlan) {
        const tripPlanWithImages = withGeneratedTripImages(tripPlan);

        setTripDetails(tripPlanWithImages);
        setTripLoading(false);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Your ${tripPlanWithImages.destination} trip is ready! Check the itinerary dashboard on the right for hotels, day plans, budget, map, and travel essentials.`,
          },
        ]);

        setTimeout(() => scrollToItinerary(), 400);

      } else if (isFinal && !tripPlan) {
        setTripLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't generate the full trip plan. Please try again or provide more details.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setTripLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Could not get a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (seededDestinationRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const destination = params.get("destination")?.trim();
    if (params.get("autostart") !== "1" || !destination) return;
    seededDestinationRef.current = true;
    queueMicrotask(() => void onSend(`I want to plan a trip to ${destination}.`));
    // Run once for a city-guide handoff; subsequent conversation state is local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const RenderGenerativeUI = (ui: string | "") => {
    switch (ui) {
      case "budget":
        return <BudgetUI onSelectOption={(v: string) => onSend(v)} />;
      case "groupSize":
        return <GroupSizeUI onSelectOption={(v: string) => onSend(v)} />;
      case "tripDuration":
        return <TripDurationUI onSelectOption={(v: string) => onSend(v)} />;
      case "final":
        return (
          <FinalUI
            disable={!tripReady}
            loading={loading && isFinal}
            viewTrip={scrollToItinerary}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.ui === "final" && !isFinal) {
      // Defer state update to avoid setState-in-effect cascading.
      queueMicrotask(() => setIsFinal(true));
    }
  }, [messages, isFinal]);

  useEffect(() => {
    if (isFinal) {
      // Defer side-effect to avoid calling onSend during the effect body.
      queueMicrotask(() => {
        void onSend("OK, let's view the trip details.");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal]);

  return (
    <div className="relative flex h-full min-h-[calc(100svh-4.25rem)] flex-col overflow-hidden">
      <div className="relative border-b border-slate-200/80 bg-gradient-to-r from-teal-50/90 via-white to-sky-50/70 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-slate-900">
              AI Travel Copilot
            </h1>
            <p className="text-xs text-slate-500">Context-aware trip builder</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-teal-100 bg-white/80 p-3 text-slate-600 shadow-sm">
            <Sparkles className="mb-1.5 size-4 text-teal-600" />
            Smart prompts
          </div>
          <div className="rounded-xl border border-sky-100 bg-white/80 p-3 text-slate-600 shadow-sm">
            <MapPinned className="mb-1.5 size-4 text-sky-600" />
            Route-aware
          </div>
        </div>
      </div>

      <section className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {messages.length === 0 && (
          <EmptyBoxState onSelectOption={(v: string) => onSend(v)} />
        )}

        <div className="mx-auto max-w-[44rem] space-y-4 lg:max-w-none">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={`${msg.role}-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-end gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[88%] ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-teal-600 to-teal-500 text-white"
                      : "border border-slate-200 bg-white text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                  }`}
                >
                  {msg.content}
                  {shouldRenderGenerativeUI(msg, idx) && (
                    <div className="mt-4">{RenderGenerativeUI(msg.ui ?? "")}</div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
                    <UserRound className="size-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && !isFinal && (
            <AIThinking message="Crafting your perfect itinerary..." />
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      <section className="relative border-t border-slate-200/80 bg-white/90 p-3 backdrop-blur-xl sm:p-4">
        {showDestinationSuggestions && (
          <div className="absolute bottom-full left-3 right-3 z-20 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:left-4 sm:right-16">
            <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Destination matches
            </p>
            {destinationSuggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => {
                  setDestinationSuggestions([]);
                  void onSend(suggestion.label);
                }}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-teal-50"
              >
                <MapPin className="size-4 shrink-0 text-teal-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{suggestion.city}</span>
                  <span className="block text-xs text-slate-500">{[suggestion.state, suggestion.country].filter(Boolean).join(", ")}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="Tell me destination, budget, dates, interests..."
            className="min-h-16 resize-none rounded-xl border-slate-200 bg-white text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus-visible:ring-teal-500/40 sm:min-h-20"
          />
          <Button
            size="icon"
            onClick={() => onSend()}
            disabled={loading}
            className="mb-1 size-11 shrink-0 rounded-xl bg-teal-600 text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ChatBox;
