-- =============================================
-- Vizuara Email Agent - Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- =============================================

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
  rag_context jsonb,
  prompt_used text,
  created_at timestamptz default now()
);

-- Final sent emails (may differ from AI draft if user edited)
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references emails(id) on delete cascade,
  draft_id uuid references drafts(id) on delete set null,
  user_id uuid references users(id) on delete cascade,
  final_body text not null,
  gmail_sent_message_id text,
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
  pace_type text,
  num_lessons integer,
  duration_hours integer,
  target_audience text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Index for fast similarity search
create index on course_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 10);
