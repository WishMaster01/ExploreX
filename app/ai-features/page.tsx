"use client";

import { Button } from "@/components/ui/button";
import { aiFeatures, type AiFeatureKey } from "@/lib/data/ai-features";
import { useUser } from "@clerk/nextjs";
import { Bot, Box, Compass, LoaderCircle, Route, Send, Sparkles, Wallet2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

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
  const [activeKey, setActiveKey] = useState<AiFeatureKey>("route-optimization");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useMemo(() => aiFeatures.find((feature) => feature.key === activeKey)!, [activeKey]);

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
    const nextMessages: AgentMessage[] = [...messages, { role: "user" as const, content }].slice(-16);
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai-features", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: activeKey, messages: nextMessages }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || "The AI agent could not respond.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The AI agent could not respond.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-teal-700"><Sparkles className="size-4" /> Specialized AI agents</div><h1 className="mt-5 font-display text-4xl font-bold text-slate-900 sm:text-5xl">Use the right travel agent for the job.</h1><p className="mt-4 text-lg leading-8 text-slate-600">Each workspace uses a constrained system prompt, focused inputs, and clear uncertainty boundaries instead of one generic assistant.</p></div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.45fr_1fr]">
          <div className="space-y-3">{aiFeatures.map((feature) => <button key={feature.key} type="button" onClick={() => selectFeature(feature.key)} className={`w-full rounded-2xl border p-4 text-left transition ${activeKey === feature.key ? "border-teal-400 bg-teal-50 shadow-md" : "border-slate-200 bg-white hover:border-teal-200"}`}><div className="flex gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${activeKey === feature.key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>{featureIcons[feature.key]}</span><span><span className="block font-heading font-bold text-slate-900">{feature.shortTitle}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{feature.description}</span></span></div></button>)}</div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-teal-500">{featureIcons[active.key]}</span><div><p className="font-heading text-xl font-bold">{active.title}</p><p className="text-xs text-slate-300">Focused agent workspace</p></div></div></div>
            <div className="min-h-[25rem] space-y-4 p-5">
              {messages.length === 0 && <div><p className="text-sm leading-7 text-slate-600">{active.description}</p><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Try an example</p><div className="mt-3 grid gap-2">{active.examples.map((example) => <button key={example} type="button" disabled={!user} onClick={() => void submit(undefined, example)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-600 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50">{example}</button>)}</div></div>}
              {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "bg-teal-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>{message.content}</div></div>)}
              {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin" /> {active.shortTitle} agent is working…</div>}
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            </div>
            <div className="border-t border-slate-200 p-4">
              {!isLoaded ? <p className="text-sm text-slate-500">Loading account…</p> : !user ? <Link href="/sign-in" className="block rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-bold text-white">Sign in to use AI agents</Link> : <form onSubmit={(event) => void submit(event)} className="flex gap-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask the ${active.shortTitle.toLowerCase()} agent…`} className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-400" /><Button type="submit" disabled={loading || !input.trim()} className="h-12 rounded-xl bg-teal-600 px-5 text-white hover:bg-teal-700"><Send className="size-4" /><span className="hidden sm:inline">Send</span></Button></form>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
