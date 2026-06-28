# AI Trip Planner

ExploreX is a full-stack travel planning application built with Next.js. It uses an AI chat workflow to collect trip preferences, generate a structured travel plan, and save the resulting hotels and itinerary to a PostgreSQL database.

## Features

### AI trip planning

- Conversational collection of origin, destination, group size, budget, duration, interests, and special requirements
- Zod-validated structured AI responses with safe JSON extraction
- Exponential retry, bounded request queue, rate limiting, and fallback responses
- Per-user TTL/LRU caching for generated trip plans

### Intelligent planning

- Debounced destination autocomplete using a Trie, fuzzy matching, and Levenshtein distance
- Typo-tolerant hotel and location search
- Haversine distance calculation and nearest-neighbor route ordering with 2-opt refinement
- Non-overlapping itinerary time-slot scheduling using visit duration and opening windows
- 0/1 knapsack activity selection within the available activity budget
- Weighted hotel ranking using rating, budget match, distance, and amenity signals
- Cosine-similarity support for ranking related saved trips

### Saved trips and operations

- PostgreSQL-backed trip, hotel, and itinerary persistence
- Dedicated Saved Trips, Explore Cities, AI Features, city guide, and Travel Signals pages
- Explicit final-step trip saving instead of automatic persistence
- Duplicate detection using SHA-256 plan hashes
- Cursor pagination, destination filtering, favorites, numeric budget/duration sorting, and deletion
- Trip, packing, and booking reminders with a cron-ready due-reminder endpoint
- Role-protected 30-day admin analytics for active users, generated trips, AI failures, events, and popular destinations
- Clerk authentication, Arcjet token-bucket protection, local sliding-window fallback, validation, and safe API errors

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Authentication:** Clerk
- **Database:** PostgreSQL
- **ORM:** Prisma
- **AI Provider:** OpenRouter through the OpenAI SDK
- **Validation:** Zod
- **Rate Limiting:** Arcjet with an in-memory development fallback
- **Testing:** Vitest
- **UI:** Radix UI primitives, Lucide icons, Motion

## Prerequisites

Before running the project, install or create:

- Node.js 20 or later
- npm
- PostgreSQL database, either local or hosted
- Clerk application
- OpenRouter API key

## Environment Variables

Create a `.env` file in the project root. You can copy `.env.example` and replace the placeholders.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=postgresql://username:password@ep-example-pooler.us-east-1.aws.neon.tech/ai_trip_planner?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/ai_trip_planner?sslmode=require
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key
ARCJET_KEY=ajkey_your_arcjet_key
ADMIN_USERS=admin@example.com,clerk_user_id
CRON_SECRET=replace_with_a_long_random_secret
```

### Required Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk key used by the frontend. |
| `CLERK_SECRET_KEY` | Server-side Clerk key used for authentication. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route used by Clerk. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route used by Clerk. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Redirect after sign-in fallback. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Redirect after sign-up fallback. |
| `DATABASE_URL` | Prisma database connection string. |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma operations. |
| `OPENROUTER_API_KEY` | API key used by `/api/aimodel` to generate trip plans. |
| `ARCJET_KEY` | Arcjet key used for production API rate limiting. |
| `ADMIN_USERS` | Comma-separated admin emails or Clerk user IDs allowed to view `/admin`. |
| `CRON_SECRET` | Bearer secret used by a scheduler to read due reminders. |

Do not commit real `.env` files. This repository keeps `.env` ignored and allows `.env.example` to be committed.

## Getting Started

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run db:generate
```

Apply the committed database migration:

```bash
npm run db:deploy
```

For rapid local-only schema prototyping, `npm run db:push` remains available, but committed migrations are the source of truth.

Start the development server:

```bash
npm run dev
```

Open the app at:

```txt
http://localhost:3000
```

## Database Setup

The app uses PostgreSQL with Prisma. For local development, create a database named `ai_trip_planner`:

```sql
CREATE DATABASE ai_trip_planner;
```

Then set `DATABASE_URL` and `DIRECT_URL` in `.env`.

For Neon, use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`:

```env
DATABASE_URL="postgresql://...-pooler.../ai_trip_planner?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://.../ai_trip_planner?sslmode=require"
```

For other hosted PostgreSQL providers, use a runtime-safe pooled connection for `DATABASE_URL` when available and a direct connection for Prisma migrations.

## Prisma Schema

The database contains six models:

| Model | Description |
| --- | --- |
| `User` | Stores the Clerk-linked profile, subscription, and application role. |
| `Trip` | Stores trip details, normalized sort fields, favorite/view state, plan hash, and full generated plan JSON. |
| `Hotel` | Stores hotel options for a trip. |
| `ItineraryItem` | Stores day-wise activity summaries for a trip. |
| `Reminder` | Stores indexed trip, packing, and booking reminders. |
| `AnalyticsEvent` | Stores indexed generation and product analytics events. |

The `20260628000000_product_intelligence` migration adds:

- Unique duplicate detection on `(userId, planHash)`
- User/recency, favorite, budget, and duration trip indexes
- Reminder indexes on user, status, due time, and trip
- Analytics indexes for event type, destination, user, and creation time

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production application. |
| `npm run start` | Start the production server after building. |
| `npm run lint` | Run the configured lint command. |
| `npm run typecheck` | Run strict TypeScript checking. |
| `npm test` | Run algorithm and reliability tests with Vitest. |
| `npm run db:generate` | Generate Prisma client types. |
| `npm run db:push` | Push the Prisma schema to the database. |
| `npm run db:deploy` | Apply committed Prisma migrations in production. |
| `npm run db:migrate` | Create and run a Prisma migration. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run db:seed` | Seed the database with demo data. |
| `npm run prisma:validate` | Validate `prisma/schema.prisma`. |

## Main Routes

| Route | Description |
| --- | --- |
| `/` | Public landing page with hero and popular city sections. |
| `/sign-in` | Clerk sign-in page. |
| `/sign-up` | Clerk sign-up page. |
| `/create-new-trip` | Authenticated trip planning workspace. |
| `/saved-trips` | Authenticated saved-trip search, sorting, favorites, reminders, and deletion. |
| `/explore-cities` | City guide catalog using curated demonstration data. |
| `/explore-cities/[slug]` | Detailed city guide with places, estimated costs, transit, season, food, and preparation notes. |
| `/ai-features` | Interactive workspaces for five specialized travel AI agents. |
| `/travel-signals/[signal]` | Weather, route, safety, and budget planning guidance. |
| `/admin` | Role-protected product analytics dashboard. |

## API Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/aimodel` | Sends chat history to OpenRouter and returns structured AI output. |
| `POST` | `/api/ai-features` | Runs a selected route, budget, destination, packing, or chat-support agent prompt. |
| `GET` | `/api/users` | Returns the authenticated user. |
| `POST` | `/api/users` | Creates or updates the authenticated user. |
| `GET` | `/api/trips` | Returns filtered, sorted, cursor-paginated saved trips. |
| `POST` | `/api/trips` | Validates and atomically saves a trip, hotels, itinerary items, and analytics event. |
| `GET` | `/api/destinations` | Returns cached prefix and fuzzy destination matches. |
| `PATCH` | `/api/trips` | Updates favorites and recently viewed state. |
| `DELETE` | `/api/trips?id=...` | Deletes an authenticated user's saved trip. |
| `GET/POST/PATCH` | `/api/reminders` | Lists, schedules, and updates trip reminders. |
| `GET` | `/api/reminders/due` | Returns due reminders to an authenticated cron worker. |
| `GET` | `/api/admin/analytics` | Returns role-protected 30-day product analytics. |

Protected routes and API endpoints require an authenticated Clerk session. `/api/reminders/due` uses `Authorization: Bearer <CRON_SECRET>`, while `/api/destinations` remains public and rate limited.

### Saved-trip query parameters

`GET /api/trips` accepts:

| Parameter | Values | Purpose |
| --- | --- | --- |
| `limit` | `1`–`30` | Page size. |
| `cursor` | Trip ID | Loads the next cursor page. |
| `search` | Text | Case-insensitive destination filtering. |
| `sort` | `recent`, `destination`, `budget`, `duration` | Selects indexed ordering. |
| `favorite` | `true` | Returns favorites only. |
| `similarTo` | Trip ID | Ranks the page by content similarity to another owned trip. |

## Project Structure

```txt
ai_trip_planner/
├── app/
│   ├── (auth)/                 # Clerk sign-in and sign-up
│   ├── admin/                  # Admin analytics dashboard
│   ├── ai-features/            # Specialized AI agent workspace
│   ├── api/                    # AI, trips, search, reminders, and analytics APIs
│   ├── create-new-trip/        # Planner chat and itinerary workspace
│   ├── explore-cities/         # City catalog and dynamic city guides
│   ├── saved-trips/            # Saved-trip dashboard route
│   ├── travel-signals/         # Weather, route, safety, and budget guidance
│   └── _components/            # Landing and saved-trip components
├── components/                 # Shared UI and travel components
├── context/                    # React context providers
├── lib/
│   ├── algorithms/             # Search, graph, budget, ranking, cache, rate-limit utilities
│   ├── data/                   # Destination search catalog
│   ├── ai-schemas.ts           # AI response schemas
│   ├── trip-optimizer.ts       # Route, schedule, ranking, and budget integration
│   └── trips-route-handlers.ts # Saved-trip API implementation
├── prisma/
│   ├── migrations/             # Committed PostgreSQL migrations
│   └── schema.prisma           # Prisma models and indexes
├── scripts/                    # Database initialization scripts
├── proxy.ts                    # Clerk route protection
└── next.config.ts              # Next.js and security configuration
```

## AI Flow

1. The user opens `/create-new-trip`.
2. The chat UI collects trip details and offers debounced destination suggestions.
3. `/api/aimodel` validates and sanitizes the conversation, applies user rate limits, and checks the final-response cache.
4. AI calls run through a bounded concurrency queue with exponential retry.
5. Zod validates the structured response before route, schedule, hotel-ranking, and budget optimizers run.
6. The optimized plan is displayed with route savings, scheduled activities, hotel match scores, and budget selections.
7. The user reviews the itinerary and chooses **Save Trip** in the final section.
8. `/api/trips` validates the plan again, checks its SHA-256 hash for duplicates, and atomically stores the trip, hotels, itinerary items, and analytics event for `/saved-trips`.

## Specialized AI Features

`/ai-features` provides separate constrained prompts for:

- Route Optimization Agent
- Smart Budget Agent
- Destination Intelligence Agent
- Packing Assistant Agent
- Travel Chat Support Agent

Each prompt defines its task boundary, required assumptions, response structure, and uncertainty rules. Agents do not claim live traffic, prices, weather, safety alerts, booking availability, or actions they did not perform.

## Algorithms and Integration

| Algorithm | Used for | Integration |
| --- | --- | --- |
| Trie | Fast prefix lookup | Destination autocomplete API |
| Levenshtein and fuzzy scoring | Typo tolerance | Destination and hotel search |
| Haversine formula | Geographic distance | Hotel ranking and attraction route metrics |
| Nearest neighbor and 2-opt | TSP approximation | Day-wise attraction ordering |
| Greedy time-slot scheduling | Conflict prevention | Opening windows and visit-duration allocation |
| 0/1 knapsack | Experience maximization | Activity selection under the activity budget |
| Weighted scoring | Personalized ranking | Hotel rating, price, distance, and amenities |
| Cosine similarity | Related-trip ranking | `similarTo` saved-trip queries |
| Priority queue and Top-K | Ranked aggregation | Recommendation utilities and admin analytics |
| LRU plus TTL cache | Reuse and bounded memory | AI plans and destination suggestions |
| Sliding window | Development abuse control | Fallback when Arcjet is not configured |

The application deliberately does not claim road-network Dijkstra or A* routing. It has geographic coordinates but no road graph or routing-provider data; Haversine nearest-neighbor optimization is the valid approximation for the available data.

## Testing and Quality Checks

Run the full local verification sequence:

```bash
npm run typecheck
npm run lint
npm test
npm run prisma:validate
npm run build
```

The Vitest suite covers destination search, fuzzy matching, route optimization, budget selection, itinerary scheduling, hotel ranking, rate limiting, cache eviction, and safe AI JSON parsing.

## Reminder Worker

The application stores reminders but does not send email or push notifications itself. A scheduler can poll due reminders using:

```http
GET /api/reminders/due
Authorization: Bearer <CRON_SECRET>
```

Results are ordered by due time and limited to 100 reminders per call so an external delivery worker can process them safely.

## Deployment Notes

For production deployment:

1. Configure all required environment variables on the hosting platform.
2. Use a production PostgreSQL database.
3. Apply the committed migrations with `npm run db:deploy`. Create future migrations locally with `npm run db:migrate` and commit them.
4. Build the application with `npm run build`.
5. Start the app with `npm run start`, or deploy it on a Next.js-compatible platform such as Vercel.
6. Set `ARCJET_KEY` in production. API routes fail closed when rate limiting is not configured in production.
7. Set `ADMIN_USERS` for the admin dashboard and `CRON_SECRET` before enabling reminder polling.

## Troubleshooting

### AI responses fail

- Confirm `OPENROUTER_API_KEY` is present in `.env`.
- Restart the dev server after changing environment variables.
- Check the server logs for `/api/aimodel` errors.

### Database connection fails

- Confirm `DATABASE_URL` and `DIRECT_URL` are valid PostgreSQL connection strings.
- Make sure the database exists.
- Run `npm run db:generate` and `npm run db:deploy`.

### Prisma fields show as unknown in the IDE

- Run `npm run db:generate` after every Prisma schema change.
- Restart the TypeScript language server or reload the editor window.
- Confirm the committed migration has been applied to the active database.

### Admin dashboard denies access

- Add the user's email or Clerk user ID to the comma-separated `ADMIN_USERS` variable, or set the database user's `role` to `admin`.
- Restart the application after changing environment variables.

### Authentication fails

- Confirm Clerk keys are valid.
- Check that Clerk sign-in and sign-up URLs match the routes configured in `.env`.
- Restart the dev server after changing Clerk environment variables.

## License

This project is private and does not currently declare an open-source license.
