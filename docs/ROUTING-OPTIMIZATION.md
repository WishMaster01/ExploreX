# Routing and Itinerary Optimization

`optimizeTripPlan` composes the existing Haversine, nearest-neighbor, bounded 2-opt, knapsack, schedule feasibility, and hotel/restaurant ranking algorithms. It ranks priced activities by stated interests, evidence reliability/freshness, geographic proximity, and category variety. Category diversity receives a small value only for verified/provider sourced experiences; unknown or unverified submissions do not get a hidden-gem boost.

## Spatial data and route metrics

The engine provides deterministic in-memory 3 km geographic grouping and bounded per-day route optimization. It deduplicates same-name/same-coordinate stops and reports stops without usable coordinates. The current Phase 5 corpus and trip candidate sets are small (at most 30 itinerary candidates per day); PostGIS indexes, KNN queries, or database radius searches would add migration and deployment cost without a demonstrated volume benefit. Revisit PostGIS when the production place corpus or query volume warrants indexed radius searches.

`distance_from_previous_km` is a provider route distance when a routing provider supplies that edge, otherwise it is a Haversine straight-line estimate. The trip-level `distance_source` reports provider, estimate, mixed, or unavailable. `travel_time_minutes` is set only for provider duration; `estimated_travel_time_minutes` and `time_travel_each_location` are explicitly labeled estimates where they derive from straight-line distance. No result claims confirmed transport mode or booking availability.

## Constraints, schedule, and currency

The engine enforces trip-day/date bounds, daily time windows, visit duration, provider/estimated maximum-leg limits, verified opening hours, known budget ceilings, and caller-provided required activity names. It returns `constraint_violations` when a hard constraint cannot be met and `warnings` for unknown prices, stale data, missing coordinates, unverified opening hours, or missing provider travel time. Unverified opening hours are ignored as facts and the general daytime window is used instead. An omitted trip currency prevents monetary totals; explicit mismatched currency markers are excluded.

Budget allocations use deterministic envelopes. The knapsack is bounded to 300 candidates and 20,000 DP units. `budget_activity_cost` describes the selected affordable activity subset; `known_activity_cost` and `known_total_cost` describe known priced planned activities and the top ranked lodging estimate. They exclude meals, unpriced attractions, local transport, and other unknown costs, which are surfaced as warnings. The engine never presents these as a complete purchase quote.

## Runtime and benchmark

Route optimization uses nearest-neighbor search and at most three 2-opt passes; scheduling is greedy and deterministic. These are practical bounded heuristics, not a global optimum. The algorithm suite includes edge-case tests.

The 30-day benchmark treats each day independently, uses the plan’s local wall-clock opening times as supplied, and does not model day-of-week hours, time zones, seasonal changes, live traffic, or transport mode. Confirm the current hours and route with providers before travel.

```sh
npx vitest bench lib/trip-optimizer.bench.ts
```

The benchmark covers 1-day/5-stop low budget, 7-day/8-stop medium budget, and 30-day/10-stop high-density inputs.
