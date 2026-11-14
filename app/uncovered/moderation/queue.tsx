"use client";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  description: string;
  destinationId: string;
  category: string;
  sourceUrl: string | null;
  accessRestrictions: string | null;
  sensitiveLocation: boolean;
  commercialRelationship: string | null;
  signals: { reason: string | null; createdAt: string }[];
};
export function ModerationQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState("");
  async function load() {
    const response = await fetch("/api/discoveries/moderation");
    const body = await response.json();
    if (response.ok) setItems(body.queue);
    else setNotice(body.error?.message ?? "Moderator access required.");
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  async function decide(item: Item, action: string) {
    const note =
      action === "approve"
        ? undefined
        : (window.prompt(
            "Give the contributor a moderation note (required):",
          ) ?? "");
    if (action !== "approve" && (!note || note.length < 1)) return;
    const sourceCorroborated =
      action === "approve" &&
      window.confirm(
        "Did you independently check the submitted source against the discovery fact? OK records source corroboration; Cancel approves without that signal.",
      );
    const response = await fetch("/api/discoveries/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        action,
        sourceCorroborated,
        ...(note ? { note } : {}),
      }),
    });
    const body = await response.json();
    setNotice(
      response.ok
        ? `Discovery ${action.replaceAll("_", " ")}.`
        : (body.error?.message ?? "Moderation action failed."),
    );
    if (response.ok) await load();
  }
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-5 py-12">
      <h1 className="text-3xl font-bold">Uncovered moderation queue</h1>
      {notice && <p role="status">{notice}</p>}
      {items.map((item) => (
        <article key={item.id} className="space-y-3 rounded-xl border p-5">
          <p className="text-sm">
            {item.destinationId} · {item.category}
          </p>
          <h2 className="text-xl font-semibold">{item.title}</h2>
          <p>{item.description}</p>
          {item.sourceUrl && (
            <a
              className="underline"
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Submitted source
            </a>
          )}
          {item.accessRestrictions && <p>Access: {item.accessRestrictions}</p>}
          {item.sensitiveLocation && (
            <p className="font-semibold text-amber-800">
              Sensitive location: review precision and risk.
            </p>
          )}
          {item.commercialRelationship && (
            <p>
              Commercial relationship disclosed: {item.commercialRelationship}
            </p>
          )}
          {item.signals.length > 0 && (
            <div>
              <p>Private reports:</p>
              {item.signals.map((signal, index) => (
                <p key={index}>{signal.reason}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {[
              ["approve", "Approve"],
              ["request_correction", "Request correction"],
              ["reject", "Reject"],
              ["remove", "Remove"],
            ].map(([action, label]) => (
              <button
                key={action}
                onClick={() => void decide(item, action)}
                className="rounded border px-3 py-2"
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      ))}
      {items.length === 0 && !notice && <p>No pending discoveries.</p>}
    </main>
  );
}
