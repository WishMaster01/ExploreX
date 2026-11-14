"use client";

import { useEffect, useState } from "react";
import { DESTINATIONS } from "@/lib/data/destinations";

type Suggestion = {
  id: string;
  title: string;
  description: string;
  category: string;
  accessRestrictions: string | null;
  sensitiveLocation: boolean;
  commercialRelationship: string | null;
  trustSignals: {
    sourceCorroborated: boolean;
    communityCorroborated: boolean;
    visitReported: boolean;
    moderatorReviewed: boolean;
  };
};

export function CommunitySuggestionsPanel({
  destination,
}: {
  destination: string;
}) {
  const city = destination.split(",")[0].trim().toLocaleLowerCase("en");
  const destinationId = DESTINATIONS.find(
    (item) =>
      item.city.toLocaleLowerCase("en") === city ||
      item.aliases.some((alias) => alias.toLocaleLowerCase("en") === city),
  )?.id;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (!destinationId) return;
    const timer = setTimeout(() => {
      void fetch(
        `/api/discoveries?destination=${encodeURIComponent(destinationId)}`,
      )
        .then(async (response) => (response.ok ? response.json() : null))
        .then((result) => {
          if (result) setSuggestions(result.discoveries);
        })
        .catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, [destinationId]);
  if (!destinationId || suggestions.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5"
      aria-labelledby="community-suggestions-heading"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
        Community submitted
      </p>
      <h2
        id="community-suggestions-heading"
        className="mt-1 text-xl font-semibold"
      >
        ExploreX Uncovered suggestions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These approved community tips are optional additions. They are not
        verified travel facts and are kept separate from your generated
        itinerary.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {suggestions.slice(0, 4).map((item) => (
          <article key={item.id} className="rounded-xl border bg-white p-4">
            <p className="text-xs uppercase text-emerald-800">
              {item.category}
            </p>
            <h3 className="mt-1 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm">{item.description}</p>
            {item.sensitiveLocation && (
              <p className="mt-2 text-sm text-amber-800">
                Sensitive location; precise location withheld.
              </p>
            )}
            {item.accessRestrictions && (
              <p className="mt-2 text-sm">Access: {item.accessRestrictions}</p>
            )}
            {item.commercialRelationship && (
              <p className="mt-2 text-sm font-medium">
                Business relationship: {item.commercialRelationship}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Community submitted
              {item.trustSignals.moderatorReviewed
                ? " · Moderator reviewed"
                : ""}
              {item.trustSignals.sourceCorroborated
                ? " · Source corroborated"
                : ""}
              {item.trustSignals.communityCorroborated
                ? " · Community corroborated"
                : ""}
              {item.trustSignals.visitReported ? " · Visit reported" : ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
