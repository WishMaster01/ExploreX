# Phase 9: Frontend product experience

## India discovery

- `/` is the India-focused landing page. It reads the validated Jaipur travel dataset and displays its current freshness, attribution, and coverage gaps.
- `/explore-india` provides taxonomy categories and searches only destination IDs whose destination datasets validate.
- `/explore-india/categories/[category]` is generated from the checked-in taxonomy. It lists source-backed matching places when present and distinguishes a destination taxonomy tag from individual experience coverage.
- `/explore-india/destinations/[destination]` renders only a valid destination dataset and includes source links, verification dates, available place names, and explicit unsupported data sections.
- `/uncovered` provides approved discovery filters and submission controls; `/uncovered/[id]` exposes a separate detail page backed by an approved-only API and withholds sensitive coordinates.
- Current curated coverage is Jaipur only. Do not add destination routes from the legacy catalog until source data and its manifest validate.

The planner retains the preference onboarding, editable itinerary timeline, budget panels, hotel and food sections, community suggestions, and route panel. The route panel only creates pins from coordinates attached to itinerary records; those coordinates remain estimates unless their provenance says otherwise. Google Maps links use those coordinate values and do not imply an address was verified.

## Account and preferences

`/settings` embeds Clerk account/profile controls and a travel preference form. Preferences are validated and saved in browser local storage under `explorex.travel-preferences.v1`; they are not sent to ExploreX or a model provider. The trip onboarding reads these values as defaults. Clearing browser storage removes them.

Saved trips continue to be owner-scoped. Their optional feedback form requires a traveler completion acknowledgement and stores overall satisfaction and optional text with publication consent disabled.

## Trip sharing

Share links are generated only by an authenticated trip owner. The server creates 256 bits of randomness and stores only the SHA-256 token hash. Creating a new link rotates the prior token; the owner can revoke the active link. The shared route is `noindex` and the API sends `no-store` and `no-referrer` headers.

The public projection includes destination, duration, day headings, activity names, details, schedules, and visit duration estimates. It excludes trip origin, budget, traveler/group details, accommodation, and account data. Anyone with the link can view that projection until it is revoked; the URL is a bearer secret and should be shared only with intended recipients.

Apply the additive database migration before deploying the share endpoints:

```bash
npm run db:deploy
```

## Trust and failure states

- The homepage and destination routes never substitute mock results when curated data is unavailable.
- Category routes show an explicit no-source-backed-records state.
- India discovery has a loading skeleton and a recoverable error boundary.
- Shared itineraries show loading and unavailable states without exposing whether a token was malformed, expired, or revoked.
- The stories endpoint returns an empty collection until consented traveler stories exist; curated destination summaries are not labeled as testimonials.
- AI-generated prices, ratings, venue facts, and coordinates remain labeled as estimates or unverified in the existing planner UI.

## Verification limits

Unit tests cover taxonomy matching, preference validation, share token hashing/ownership/revocation, and the public share projection. The repository has no browser automation setup, so visual mobile breakpoints and keyboard behavior still require manual browser review before release.
