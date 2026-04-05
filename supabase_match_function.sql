-- Run this in Supabase SQL Editor after the schema migration
-- Creates a function for vector similarity search

create or replace function match_courses(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  course_name text,
  course_link text,
  course_description text,
  price text,
  starting_date text,
  pace_type text,
  num_lessons integer,
  duration_hours integer,
  target_audience text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    ce.id,
    ce.course_name,
    ce.course_link,
    ce.course_description,
    ce.price,
    ce.starting_date,
    ce.pace_type,
    ce.num_lessons,
    ce.duration_hours,
    ce.target_audience,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from course_embeddings ce
  where 1 - (ce.embedding <=> query_embedding) > match_threshold
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;
