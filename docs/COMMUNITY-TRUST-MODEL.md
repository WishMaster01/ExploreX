# ExploreX Uncovered: Community Trust Model

## Signal meanings

These signals are independent and are never collapsed into a single “verified” badge:

| Signal | Meaning | Does not establish |
| --- | --- | --- |
| Community submitted | A signed-in contributor submitted the record | Accuracy, visit, safety, or quality |
| Source corroborated | A moderator has checked a cited source against the stated fact | Current availability or a personal visit |
| Visit evidence supplied | Supporting material is actually supplied and separately assessed | Genuine visit or quality; GPS and photos alone are not proof |
| Visit reported | A user voluntarily reports visiting | Independently verified visit or quality |
| Community corroborated | Distinct community accounts recommend the same discovery | Accuracy or independence of those accounts |
| Moderator reviewed | A moderator made a recorded workflow decision | Endorsement, guarantee, or permanent accuracy |

Public cards disclose commercial relationships and show cost, duration, access restrictions, and sensitivity warnings only when supplied. Contributors are displayed anonymously as “Community traveler”; profile names, images, trips, and account identifiers are not exposed.

## Moderation policy

New and edited submissions are `PENDING` and private to their owner until approval. Moderators can approve, reject with a note, request corrections, or remove an approved record. Correction requests and pending records are not retrievable publicly. Contributors may edit pending/correction-requested records and delete their own records; edits return to pending review. Reports are unique per account and discovery. Submission and write routes have rate limits, strict schemas, duplicate checks, and a daily submission cap. Repeated or coordinated abuse is handled through account-level rate limiting and moderator review; no automated public accusations are made.

Reports do not automatically prove abuse. A moderator reviews the report reason and decides whether to retain, correct, reject, or remove the discovery. Report reasons are private. Corrections preserve an audit-relevant moderation note/status but the current implementation does not expose private trip data or raw conversations.

## Sensitive places

Contributors flag sensitive ecological, sacred, private, or vulnerable locations. Public responses suppress exact coordinates and location labels for flagged records. Moderators should reject precise access guidance that could expose protected sites, trespass routes, nesting areas, or private residences. A public record should include only the least precise location needed for a responsible visit. A flag is a protective signal, not a claim that a location has been formally designated sensitive.

## Feedback, privacy, and measurement

Feedback is optional and accepted only when the discovery title is present in a trip owned by the submitting account. The trip itself is never exposed. Overall trip satisfaction and experience-specific satisfaction/preference-match values are 1–5; written feedback is optional. Feedback affects public averages/ranking only when the contributor separately consents to publication. The application does not use private conversations for training. User deletion cascades owned discoveries, saves, signals, and feedback; moderators can remove public visibility without requiring contributor deletion.

Initial ranking is deterministic and documented in `lib/community/policy.ts`: saved and recommendation counts have bounded weights, reported visits have a small weight, consented satisfaction contributes modestly, age decays slowly, and exact category-interest matches can receive a small preference boost (`interests=craft,food`). Unclassified reports do not automatically lower rank. Popularity, photos, coordinates, and trip completion are not proof of quality. Saves, recommendation actions, visit reports, and consented feedback are recorded. Itinerary-panel exposure, trip additions, and categorized inaccurate-content reporting are not currently recorded and remain measurement follow-ups.

## Retrieval boundary

Only moderator-approved discoveries are publicly listable by destination and category, ranked using transparent bounded engagement rules. Approved tips appear as a separate optional panel on matching itinerary pages; they remain labeled `community-submitted`, do not alter generated plans, and do not satisfy the Phase 6 factual evidence gate. This keeps them discoverable during trip planning without presenting unverified claims as itinerary facts.

## Operational rollout

Apply migration `20261112000000_community_discoveries` with the normal reviewed Prisma migration deployment before enabling the API. Moderation requires an account whose stored role is `admin` or whose identity is in the configured admin allowlist. Keep publication consent explicit, review queue access restricted, and abuse reports private.
