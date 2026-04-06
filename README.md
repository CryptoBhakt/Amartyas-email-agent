# Your Email Agent

An AI-powered email reply assistant that reads your Gmail inbox, drafts smart replies using your knowledge base, and lets you review before sending.

## What Does It Do?

1. **Fetches your emails** from Gmail's primary inbox
2. **Generates AI reply drafts** using OpenAI or Gemini, grounded in your course/product knowledge base
3. **Lets you edit** the draft before sending — nothing is sent automatically
4. **Sends the reply** through your Gmail with one click
5. **Stores both versions** — the AI draft and what you actually sent — so you can compare later
6. **Collects your feedback** — rate each reply 1-5 stars to track quality over time

## Tech Stack

| What | Technology |
|------|-----------|
| Frontend | Next.js, Tailwind CSS |
| Auth | Google Login (OAuth) |
| Email | Gmail API |
| AI | OpenAI (GPT-4o-mini) + Google Gemini |
| Database | Supabase (PostgreSQL + pgvector) |
| Search | RAG (Retrieval Augmented Generation) over your knowledge base |
| Hosting | Vercel |

## Prerequisites

Before you start, you'll need accounts on these (all have free tiers):

- [Google Cloud Console](https://console.cloud.google.com) — for Gmail API + OAuth
- [Supabase](https://supabase.com) — for the database
- [OpenAI](https://platform.openai.com) — for AI replies + embeddings
- [Vercel](https://vercel.com) — for deployment (optional, you can run locally)
- [Node.js](https://nodejs.org) v18+ installed on your computer

## Setup Guide (Step by Step)

### 1. Clone the repo

```bash
git clone https://github.com/CryptoBhakt/Amartyas-email-agent.git
cd Amartyas-email-agent
npm install
```

### 2. Set up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a new project
2. Enable the **Gmail API** (APIs & Services → Enable APIs → search "Gmail API")
3. Go to **OAuth consent screen** → choose "External" → fill in app name and your email
4. Add your email as a **test user** (OAuth consent screen → Test users → Add)
5. Go to **Credentials** → Create **OAuth Client ID** → choose "Web application"
6. Add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://your-vercel-url.vercel.app/api/auth/callback/google` (for production)
7. Copy the **Client ID** and **Client Secret**

### 3. Set up Supabase

1. Go to [Supabase](https://supabase.com/dashboard) and create a new project
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql` (creates all tables)
3. Then run the contents of `supabase_match_function.sql` (creates the search function)
4. Then run the contents of `supabase_schema_v2.sql` (updates tables to final structure)
5. Go to **Settings → API** and copy your **Project URL**, **anon key**, and **service_role key**

### 4. Set up environment variables

Create a file called `.env.local` in the project root:

```
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Gemini (optional — only needed if you want to use Gemini for drafts)
GEMINI_API_KEY=your_gemini_api_key

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth (generate a random secret with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

### 5. Load your knowledge base

The file `courses_dummy_dataset_150.csv` contains sample course data. To load it into the database:

```bash
npx tsx --env-file=.env.local scripts/embed-courses.ts
```

This reads the CSV, generates AI embeddings for each course, and stores them in Supabase for smart search.

### 6. Run the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. Sign in with Google and you're ready to go!

## How to Use

1. **Sign in** with your Google account
2. Click **Fetch Emails** to load your Gmail inbox
3. Click on any email to read it
4. Choose **OpenAI** or **Gemini** from the dropdown
5. Click **Generate Reply** — the AI drafts a reply using your knowledge base
6. **Edit** the draft if needed (toggle between Edit HTML and Preview)
7. Click **Show Full LLM Context** to see exactly what was sent to the AI
8. Click **Approve & Send** to send the reply
9. **Rate** the reply with stars and optional feedback
10. Visit **History** to see all past replies and compare AI drafts vs what you sent

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home — redirects to inbox or login
│   │   ├── login/page.tsx        # Google sign-in page
│   │   ├── inbox/page.tsx        # Main inbox with email list + draft editor
│   │   ├── history/page.tsx      # Past replies with side-by-side comparison
│   │   └── api/
│   │       ├── auth/             # Google OAuth handler
│   │       ├── emails/fetch/     # Fetch emails from Gmail
│   │       ├── emails/send/      # Send reply via Gmail
│   │       ├── drafts/generate/  # Generate AI draft with RAG
│   │       ├── feedback/         # Save star rating + feedback
│   │       └── history/          # Fetch past replies
│   ├── components/
│   │   ├── Navbar.tsx            # Top navigation bar
│   │   └── Providers.tsx         # NextAuth session provider
│   └── lib/
│       ├── supabase.ts           # Supabase client
│       ├── gmail.ts              # Gmail API helpers
│       ├── llm.ts                # OpenAI + Gemini integration
│       ├── rag.ts                # Vector search for course knowledge
│       └── google-auth.ts        # Token refresh logic
├── scripts/
│   └── embed-courses.ts          # Script to embed CSV into Supabase
├── courses_dummy_dataset_150.csv # Sample knowledge base
├── supabase_schema.sql           # Database tables
├── supabase_schema_v2.sql        # Updated tables (run after schema.sql)
├── supabase_match_function.sql   # Vector search function
└── .env.local                    # Your secret keys (not committed)
```

## Deploying to Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod --yes`
4. Add all environment variables from `.env.local` to Vercel (Settings → Environment Variables)
5. Update `NEXTAUTH_URL` to your Vercel URL
6. Add the Vercel URL to Google Cloud OAuth redirect URIs

## Important Notes

- **Emails are never sent automatically.** You must click "Approve & Send" every time.
- **Your Gmail credentials stay secure.** They're stored in your own Supabase database and never shared.
- **Only you can access the app.** Google OAuth ensures only the account owner can log in.
- **The AI uses your knowledge base.** Replies are grounded in the course data you provide, not hallucinated.
