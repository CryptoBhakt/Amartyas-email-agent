# Vizuara Email Reply Agent

## Project Overview

An AI-powered email reply agent for Gmail that helps Vizuara (an online education platform) respond to incoming emails about their courses and programs. The agent fetches emails from the Gmail primary inbox, drafts context-aware replies using RAG over the course knowledge base, and lets the owner review/edit before sending.

## Architecture

### Frontend (Next.js on Vercel)
- **Framework**: Next.js (App Router)
- **Deployment**: Vercel
- **Auth**: Google OAuth (only the email owner can access)
- **UI Features**:
  - Inbox view showing fetched primary emails
  - AI-drafted reply editor (editable before sending)
  - One-click approve & send button (no auto-sending ever)
  - Star rating (1-5) and textual feedback input per reply
  - Knowledge base management view (optional)

### Backend (Railway)
- **Runtime**: Node.js or Python (FastAPI)
- **Responsibilities**:
  - Gmail API integration (fetch emails, send replies)
  - LLM-based reply generation (OpenAI or Gemini API)
  - RAG pipeline: embed query -> vector search in Supabase -> augment prompt with relevant course info
  - Store email data, drafts, sent replies, and feedback in Supabase

### Database & Vector Store (Supabase)
- **PostgreSQL tables**:
  - `emails` — original incoming emails (subject, body, sender, timestamp)
  - `drafts` — AI-generated draft replies linked to emails
  - `sent_emails` — final sent version (may differ from draft if user edited)
  - `feedback` — star rating (1-5) and text feedback per reply
  - `users` — authenticated user info
- **Vector store** (pgvector):
  - `course_embeddings` — vectorized course knowledge base (from CSV)
  - Used for RAG retrieval to ground replies in accurate course/program info

### Supabase Table Schemas

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Users table (populated via Google OAuth)
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  google_access_token text,
  google_refresh_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Incoming emails fetched from Gmail
create table emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  gmail_message_id text unique not null,
  gmail_thread_id text,
  from_email text not null,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz not null,
  is_read boolean default false,
  status text default 'pending' check (status in ('pending', 'drafted', 'sent', 'skipped')),
  created_at timestamptz default now()
);

-- AI-generated draft replies
create table drafts (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references emails(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  ai_draft_body text not null,
  model_used text,
  rag_context jsonb,           -- stores the retrieved course chunks used for this draft
  prompt_used text,            -- the full prompt sent to the LLM
  created_at timestamptz default now()
);

-- Final sent emails (may differ from AI draft if user edited)
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references emails(id) on delete cascade,
  draft_id uuid references drafts(id) on delete set null,
  user_id uuid references users(id) on delete cascade,
  final_body text not null,    -- what was actually sent (after user edits)
  gmail_sent_message_id text,  -- Gmail message ID of the sent reply
  sent_at timestamptz default now()
);

-- Star rating and textual feedback per reply
create table feedback (
  id uuid primary key default gen_random_uuid(),
  sent_email_id uuid references sent_emails(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  star_rating integer check (star_rating between 1 and 5),
  feedback_text text,
  created_at timestamptz default now()
);

-- Course knowledge base with vector embeddings for RAG
create table course_embeddings (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  course_link text,
  course_description text,
  price text,
  starting_date text,
  pace_type text,              -- 'Live' or 'Self-paced'
  num_lessons integer,
  duration_hours integer,
  target_audience text,
  content text not null,       -- concatenated text chunk used for embedding
  embedding vector(1536),      -- OpenAI text-embedding-3-small dimension (adjust if using Gemini)
  created_at timestamptz default now()
);

-- Index for fast similarity search
create index on course_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 10);
```

### Knowledge Base
- **Source**: `vizuara_courses_dummy_dataset_150.csv` in the repo root
- **Fields**: Course name, link, description, price, start date, live/self-paced, lessons, duration, target audience
- **Processing**: Chunk and embed the CSV rows, store in Supabase pgvector for semantic search
- **Purpose**: When drafting a reply, retrieve relevant course info so the AI response is accurate and specific

## Key Rules

1. **Never send an email automatically.** Every reply must be explicitly approved by the user with a button click.
2. **Store both versions.** The original AI draft and the final sent version (after user edits) must both be saved to Supabase.
3. **Authentication is mandatory.** Google OAuth — only the Gmail account owner can access the app.
4. **Feedback on every reply.** Each sent reply should have an optional star rating and text feedback field, stored in Supabase.
5. **RAG over course data.** Reply drafting must use vector search over the course knowledge base, not just raw LLM generation.
6. **Phased implementation.** Build incrementally — plan first, confirm preferences with the user, then execute phase by phase.

## Implementation Phases

### Phase 1: Foundation
- Initialize Next.js project
- Set up Supabase project (tables, pgvector extension)
- Google OAuth authentication
- Basic app layout and routing

### Phase 2: Knowledge Base & RAG
- Parse and embed `vizuara_courses_dummy_dataset_150.csv`
- Store embeddings in Supabase pgvector
- Build RAG retrieval function (query embedding -> similarity search -> return top-k results)

### Phase 3: Gmail Integration
- Set up Gmail API (OAuth2 scopes for read + send)
- Fetch emails from primary inbox
- Display emails in the frontend inbox view

### Phase 4: AI Reply Drafting
- Integrate OpenAI or Gemini API for reply generation
- Build prompt template that includes retrieved course context from RAG
- Display draft in an editable text area

### Phase 5: Review, Edit & Send
- Editable draft UI with approve/send button
- Send reply via Gmail API on approval
- Store both AI draft and final sent version in Supabase

### Phase 6: Feedback & Polish
- Add star rating + text feedback per reply
- Store feedback in Supabase
- UI polish, error handling, loading states

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Frontend       | Next.js (App Router), Tailwind CSS|
| Auth           | Google OAuth via NextAuth.js      |
| Backend/API    | Next.js API routes + Railway (if needed) |
| LLM            | OpenAI API and Gemini API (user-selectable) |
| Database       | Supabase (PostgreSQL + pgvector)  |
| Email          | Gmail API                         |
| Deployment     | Vercel (frontend), Railway (backend) |
| Embeddings     | OpenAI text-embedding-3-small          |

## Environment Variables Required

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_API_KEY=
OPENAI_API_KEY= (or GEMINI_API_KEY=)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## File Structure (Planned)

```
/
├── claud.md
├── idea.md
├── vizuara_courses_dummy_dataset_150.csv
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── inbox/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── emails/
│   │   │   ├── drafts/
│   │   │   ├── send/
│   │   │   └── feedback/
│   │   └── ...
│   ├── components/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── gmail.ts
│   │   ├── rag.ts
│   │   ├── llm.ts
│   │   └── embeddings.ts
│   └── types/
├── scripts/
│   └── embed-courses.ts   # one-time script to embed CSV into Supabase
├── .env.local
├── package.json
└── next.config.js
```