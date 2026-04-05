-- =============================================
-- Vizuara Email Agent - Schema V2
-- Only reply-related data is stored.
-- Run this in Supabase SQL Editor.
-- First drop old tables if they exist:
-- =============================================

drop table if exists feedback cascade;
drop table if exists sent_emails cascade;
drop table if exists drafts cascade;
drop table if exists emails cascade;

-- AI-generated draft replies (stores original email context inline)
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  from_email text not null,
  from_name text,
  subject text,
  original_body text,
  ai_draft_body text not null,
  model_used text,
  rag_context jsonb,
  prompt_used text,
  created_at timestamptz default now()
);

-- Final sent emails (may differ from AI draft if user edited)
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id) on delete set null,
  user_id uuid references users(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  from_email text not null,
  subject text,
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
