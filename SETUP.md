# AI Trip Planner - Setup Guide

## Database Setup (PostgreSQL + Prisma)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up PostgreSQL Database

#### Option A: Local PostgreSQL

1. Install PostgreSQL on your system
2. Create a database:

```sql
CREATE DATABASE ai_trip_planner;
```

#### Option B: Use a Cloud Database (Recommended)

- **Neon** (Free tier available): https://neon.tech
- **Supabase** (Free tier available): https://supabase.com
- **Railway** (Free tier available): https://railway.app

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_trip_planner?schema=public"

# Clerk Authentication (get these from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# OpenRouter AI provider
OPENROUTER_API_KEY=your_openrouter_api_key

# Arcjet rate limiting
ARCJET_KEY=your_arcjet_key
```

### 4. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Create migrations locally
npm run db:migrate

# Apply committed migrations in production
npm run db:deploy
```

### 5. Start Development Server

```bash
npm run dev
```

## What Changed

### Removed:

- ✅ Convex integration completely removed
- ✅ All Convex dependencies removed
- ✅ Convex files and folders deleted

### Added:

- ✅ **Prisma** - Type-safe database ORM
- ✅ **PostgreSQL** - Reliable relational database
- ✅ **REST API routes** - Standard Next.js API routes
- ✅ **Better error handling** - More robust error management
- ✅ **Type safety** - Full TypeScript support

### Benefits of the New Setup:

1. **More Reliable**: PostgreSQL is battle-tested and widely used
2. **Better Performance**: Optimized queries and indexing
3. **Easier Debugging**: Standard SQL queries and database tools
4. **More Control**: Full control over your data layer
5. **Better Type Safety**: Prisma generates types from your schema
6. **Easier Deployment**: Standard database deployment patterns

## API Endpoints

### Users

- `POST /api/users` - Create or get user
- `GET /api/users` - Get authenticated user

### Trips

- `POST /api/trips` - Create new trip
- `GET /api/trips` - Get authenticated user's trips

## Database Schema

The new schema includes:

- **Users**: id, email, name, imageUrl, subscription
- **Trips**: id, budget, destination, duration, groupSize, origin, userId
- **Hotels**: id, name, pricePerNight, rating, amenities, tripId
- **ItineraryItems**: id, day, activities, tripId

## Troubleshooting

### Database Connection Issues

1. Check your DATABASE_URL format
2. Ensure PostgreSQL is running
3. Verify database credentials

### Prisma Issues

```bash
# Reset Prisma client
npx prisma generate
npx prisma db push
```

### Development Tools

```bash
# Open Prisma Studio (database GUI)
npm run db:studio
```

## Migration from Convex

The migration is complete! Your app now uses:

- **Prisma** instead of Convex mutations
- **PostgreSQL** instead of Convex database
- **REST APIs** instead of Convex queries
- **Standard React hooks** instead of Convex hooks

All functionality remains the same, but with better reliability and performance.
