import OpenAI from "openai";
import { supabaseAdmin } from "./supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export interface CourseMatch {
  id: string;
  course_name: string;
  course_link: string;
  course_description: string;
  price: string;
  starting_date: string;
  pace_type: string;
  num_lessons: number;
  duration_hours: number;
  target_audience: string;
  content: string;
  similarity: number;
}

export async function searchCourses(
  query: string,
  matchCount: number = 5,
  matchThreshold: number = 0.3
): Promise<CourseMatch[]> {
  const embedding = await getEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc("match_courses", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("RAG search error:", error);
    return [];
  }

  return data as CourseMatch[];
}
