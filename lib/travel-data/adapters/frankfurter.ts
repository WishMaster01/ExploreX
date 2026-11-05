import "server-only";
import { z } from "zod";
import { DomainError } from "@/lib/domain/errors";
import type { SourceMetadata } from "@/lib/domain/travel";
import type {
  CurrencyProvider,
  CurrencyRateInput,
  CurrencyRate,
  ProviderResult,
} from "@/lib/travel-data/ports";
import { APP_CONFIG } from "@/lib/config";
import {
  requestProviderJson,
  parseProviderResponse,
  providerTimestamp,
} from "./http";

const rateResponseSchema = z.object({
  date: z.string().date(),
  base: z.string().regex(/^[A-Z]{3}$/i),
  quote: z.string().regex(/^[A-Z]{3}$/i),
  rate: z.number().finite().positive(),
});

export class FrankfurterCurrencyAdapter implements CurrencyProvider {
  readonly name = "frankfurter";

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs: number = APP_CONFIG.travelData.timeoutMs,
  ) {}

  async getRate(
    input: CurrencyRateInput,
  ): Promise<ProviderResult<CurrencyRate | null>> {
    const base = input.baseCurrency.trim().toUpperCase();
    const quote = input.quoteCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote))
      throw new DomainError(
        "VALIDATION_ERROR",
        "Currency codes must be ISO 4217 codes",
      );
    const url = new URL(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(base.toLowerCase())}/${encodeURIComponent(quote.toLowerCase())}`,
    );
    if (input.at) {
      const date = new Date(input.at);
      if (Number.isNaN(date.valueOf()))
        throw new DomainError(
          "VALIDATION_ERROR",
          "Currency rate date is invalid",
        );
      url.searchParams.set("date", date.toISOString().slice(0, 10));
    }
    const raw = await requestProviderJson(
      this.fetcher,
      url,
      { cache: "no-store" },
      this.timeoutMs,
    );
    const retrievedAt = providerTimestamp();
    const rate = parseProviderResponse(rateResponseSchema, raw);
    if (rate.base.toUpperCase() !== base || rate.quote.toUpperCase() !== quote)
      throw new DomainError(
        "PROVIDER_UNAVAILABLE",
        "Currency provider returned a different currency pair",
      );
    const items: CurrencyRate = {
      baseCurrency: base,
      quoteCurrency: quote,
      rate: rate.rate,
      asOf: `${rate.date}T00:00:00.000Z`,
    };
    const source: SourceMetadata = {
      status: "PROVIDER_SOURCED",
      provider: this.name,
      sourceId: `${base}/${quote}/${rate.date}`,
      retrievedAt,
      validUntil: null,
      confidence: null,
      attribution: "Frankfurter exchange-rate API; blended reference rate",
      note: "Indicative reference rate; not a cash, card, or transaction quote.",
    };
    return { items, source };
  }
}
