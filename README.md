# AI Trip Planner

ExploreX is a full-stack travel planning application built with Next.js. It uses an AI chat workflow to collect trip preferences, generate a structured travel plan, and save the resulting hotels and itinerary to a PostgreSQL database.

## Features

- AI-powered trip planning chat
- Step-by-step collection of origin, destination, group size, budget, duration, interests, and special preferences
- Generated hotel suggestions and day-wise itinerary
- Authenticated user accounts with Clerk
- Saved trips backed by PostgreSQL and Prisma
- Responsive itinerary dashboard for generated travel plans
- Server-side API validation and error handling
- Security headers configured through Next.js

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Authentication:** Clerk
- **Database:** PostgreSQL
- **ORM:** Prisma
- **AI Provider:** OpenRouter through the OpenAI SDK
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

Apply the Prisma schema to your database:

```bash
npm run db:push
```

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

The database contains four main models:

| Model | Description |
| --- | --- |
| `User` | Stores user profile data linked to Clerk. |
| `Trip` | Stores core trip details and the full generated plan JSON. |
| `Hotel` | Stores hotel options for a trip. |
| `ItineraryItem` | Stores day-wise activity summaries for a trip. |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production application. |
| `npm run start` | Start the production server after building. |
| `npm run lint` | Run the configured lint command. |
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

## API Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/aimodel` | Sends chat history to OpenRouter and returns structured AI output. |
| `GET` | `/api/users` | Returns the authenticated user. |
| `POST` | `/api/users` | Creates or updates the authenticated user. |
| `GET` | `/api/trips` | Returns saved trips for the authenticated user. |
| `POST` | `/api/trips` | Saves a generated trip, hotels, itinerary items, and full plan JSON. |

Protected routes and API endpoints require an authenticated Clerk session.

## Project Structure

```txt
ai_trip_planner/
├── app/
│   ├── (auth)/                 # Clerk sign-in and sign-up pages
│   ├── api/                    # Next.js API routes
│   ├── create-new-trip/        # Trip planner chat and itinerary dashboard
│   ├── _components/            # Landing page components
│   ├── layout.tsx              # Root layout and Clerk provider
│   └── page.tsx                # Landing page
├── components/
│   ├── travel/                 # Travel-specific UI components
│   └── ui/                     # Shared UI primitives
├── context/                    # React context providers
├── lib/                        # API helpers, auth helpers, Prisma client, types
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   └── init-db.js              # Demo seed script
├── proxy.ts                    # Clerk route protection
└── next.config.ts              # Next.js config and security headers
```

## AI Flow

1. The user opens `/create-new-trip`.
2. The chat UI collects trip details one question at a time.
3. The client calls `/api/aimodel` with the conversation history.
4. The server sends the prompt to OpenRouter using the OpenAI SDK.
5. The final response is parsed as JSON and displayed in the itinerary dashboard.
6. The completed trip is saved through `/api/trips`.

## Deployment Notes

For production deployment:

1. Configure all required environment variables on the hosting platform.
2. Use a production PostgreSQL database.
3. Create migrations locally with `npm run db:migrate`, commit the generated `prisma/migrations` files, and apply them in production with `npm run db:deploy`.
4. Build the application with `npm run build`.
5. Start the app with `npm run start`, or deploy it on a Next.js-compatible platform such as Vercel.
6. Set `ARCJET_KEY` in production. API routes fail closed when rate limiting is not configured in production.

## Troubleshooting

### AI responses fail

- Confirm `OPENROUTER_API_KEY` is present in `.env`.
- Restart the dev server after changing environment variables.
- Check the server logs for `/api/aimodel` errors.

### Database connection fails

- Confirm `DATABASE_URL` and `DIRECT_URL` are valid PostgreSQL connection strings.
- Make sure the database exists.
- Run `npm run db:generate` and `npm run db:push`.

### Authentication fails

- Confirm Clerk keys are valid.
- Check that Clerk sign-in and sign-up URLs match the routes configured in `.env`.
- Restart the dev server after changing Clerk environment variables.

## License

This project is private and does not currently declare an open-source license.
