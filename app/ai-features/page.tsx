"use client";

import { Button } from "@/components/ui/button";
import { aiFeatures, type AiFeatureKey } from "@/lib/data/ai-features";
import { useUser } from "@clerk/nextjs";
import {
  Bot,
  Box,
  Compass,
  LoaderCircle,
  Route,
  Send,
  Sparkles,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AgentMessage = { role: "user" | "assistant"; content: string };

const featureIcons: Record<AiFeatureKey, React.ReactNode> = {
  "route-optimization": <Route className="size-5" />,
  "smart-budget": <Wallet2 className="size-5" />,
  "destination-intel": <Compass className="size-5" />,
  "packing-assistant": <Box className="size-5" />,
  "chat-support": <Bot className="size-5" />,
};

export default function AiFeaturesPage() {
  const { user, isLoaded } = useUser();
  const [features, setFeatures] = useState(aiFeatures);
  const [activeKey, setActiveKey] =
    useState<AiFeatureKey>("route-optimization");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useMemo(
    () => features.find((feature) => feature.key === activeKey) ?? features[0],
    [activeKey, features],
  );

  useEffect(() => {
    fetch("/api/ai-features")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.features) && data.features.length)
          setFeatures(data.features);
      })
      .catch(() => {});
  }, []);

  const selectFeature = (key: AiFeatureKey) => {
    setActiveKey(key);
    setMessages([]);
    setError("");
    setInput("");
  };

  const submit = async (event?: FormEvent, suggestedText?: string) => {
    event?.preventDefault();
    const content = (suggestedText ?? input).trim();
    if (!content || loading || !user) return;
    const nextMessages: AgentMessage[] = [
      ...messages,
      { role: "user" as const, content },
    ].slice(-16);
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: activeKey, messages: nextMessages }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data?.error?.message || "The AI agent could not respond.",
        );
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The AI agent could not respond.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-20 left-10 size-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-40 right-10 size-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-300">
            <Sparkles className="size-3.5" />
            Specialized Intelligence Cockpit
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            Use the Right Travel Agent{" "}
            <span className="gradient-text">for the Job.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300">
            Each spatial copilot uses focused inputs, constrained reasoning
            boundaries, and destination knowledge instead of a single generic
            chatbot.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.45fr_1fr]">
          {/* Left Agent Selector Buttons */}
          <div className="space-y-3">
            {features.map((feature) => (
              <button
                key={feature.key}
                type="button"
                onClick={() => selectFeature(feature.key)}
                className={`w-full rounded-3xl border p-4 text-left transition-all duration-300 ${
                  activeKey === feature.key
                    ? "border-teal-400/60 bg-teal-500/15 shadow-[0_0_25px_rgba(20,184,166,0.2)]"
                    : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex gap-3.5">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                      activeKey === feature.key
                        ? "bg-gradient-to-br from-teal-400 to-sky-400 text-slate-950 font-bold shadow-md shadow-teal-500/25"
                        : "border border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {featureIcons[feature.key]}
                  </span>
                  <div>
                    <span className="block font-heading text-sm font-bold text-white">
                      {feature.shortTitle}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                      {feature.description}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right Spatial Glass Agent Console */}
          <section className="overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 backdrop-blur-2xl shadow-2xl flex flex-col justify-between min-h-[580px]">
            {/* Console Header */}
            <div className="border-b border-white/10 bg-slate-950/70 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
                  {featureIcons[active.key]}
                </span>
                <div>
                  <p className="font-heading text-lg font-bold text-white">
                    {active.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dedicated Travel Reasoning Agent
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold text-teal-300">
                <span className="size-2 rounded-full bg-teal-400 animate-pulse" />
                <span>Online</span>
              </div>
            </div>

            {/* Conversation Window */}
            <div className="flex-1 space-y-4 p-6 overflow-y-auto max-h-[460px]">
              {messages.length === 0 && (
                <div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {active.description}
                  </p>
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Try an example prompt
                  </p>
                  <div className="mt-3 grid gap-2.5">
                    {active.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        disabled={!user}
                        onClick={() => void submit(undefined, example)}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left text-xs font-medium text-slate-200 transition hover:border-teal-400/50 hover:bg-teal-500/10 disabled:opacity-50"
                      >
                        &ldquo;{example}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-medium shadow-md shadow-teal-500/20"
                        : "border border-white/10 bg-white/5 text-slate-200 backdrop-blur-md"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-teal-300">
                  <LoaderCircle className="size-4 animate-spin text-teal-400" />
                  <span>{active.shortTitle} agent is analyzing…</span>
                </div>
              )}

              {error && (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300">
                  {error}
                </p>
              )}
            </div>

            {/* Input Form Bar */}
            <div className="border-t border-white/10 p-5 bg-slate-950/60">
              {!isLoaded ? (
                <p className="text-xs text-slate-400">Loading user profile…</p>
              ) : !user ? (
                <Link
                  href="/sign-in"
                  className="block rounded-2xl bg-gradient-to-r from-teal-400 to-sky-400 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg"
                >
                  Sign in to use specialized AI agents
                </Link>
              ) : (
                <form
                  onSubmit={(event) => void submit(event)}
                  className="flex gap-2.5"
                >
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    placeholder={`Ask the ${active.shortTitle.toLowerCase()} agent…`}
                    className="min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-teal-400/60"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="h-12 rounded-2xl bg-teal-500 px-5 text-slate-950 font-bold hover:bg-teal-400 shadow-lg shadow-teal-500/20"
                  >
                    <Send className="size-4" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
