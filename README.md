# NEXTMSG

> Never wonder what to say next.

AI conversation copilot that writes replies like you would.

## Setup

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for NextAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `OPENROUTER_API_KEY` — OpenRouter API key
- `OPENROUTER_MODEL` — Model to use (default: `google/gemma-4-26b-a4b-it:free`)

## Architecture

- **Next.js App Router** — Full-stack framework
- **Prisma** — Database ORM
- **NextAuth** — Authentication
- **OpenRouter** — AI provider (supports multiple models)
- **Tailwind CSS** — Styling

## AI Pipeline

1. Screenshot/text input → Normalized conversation
2. Conversation analysis → Stage, engagement, signals
3. Reply generation → 6 candidate strategies
4. Humanization → Remove AI-like patterns
5. Ranking → Best match + alternatives

## API Routes

```
POST /api/analyze/text         — Parse text conversation
POST /api/analyze/screenshot   — Extract from screenshot
POST /api/replies/generate     — Generate replies
POST /api/replies/feedback     — Record user feedback
GET  /api/style/profile        — Get style profile
POST /api/style/profile        — Analyze style from examples
GET  /api/conversations        — List conversations
DELETE /api/conversations/:id  — Delete conversation
GET  /api/profile              — Get user profile
PATCH /api/profile             — Update user profile
```
