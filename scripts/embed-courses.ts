import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface CourseRow {
  "Course name": string;
  "Course link": string;
  "Course description": string;
  Price: string;
  "Starting date": string;
  "Whether it is live or self-paced": string;
  "Number of lessons": string;
  "Total duration in number of hours": string;
  "Who the course is meant for": string;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

function buildContentChunk(row: CourseRow): string {
  return [
    `Course: ${row["Course name"]}`,
    `Description: ${row["Course description"]}`,
    `Price: ${row["Price"]}`,
    `Starting date: ${row["Starting date"]}`,
    `Format: ${row["Whether it is live or self-paced"]}`,
    `Lessons: ${row["Number of lessons"]}`,
    `Duration: ${row["Total duration in number of hours"]} hours`,
    `Target audience: ${row["Who the course is meant for"]}`,
    `Link: ${row["Course link"]}`,
  ].join("\n");
}

async function main() {
  const csvPath = path.join(__dirname, "..", "vizuara_courses_dummy_dataset_150.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records: CourseRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} courses. Starting embeddings...`);

  // Clear existing embeddings
  const { error: deleteError } = await supabase
    .from("course_embeddings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("Error clearing existing embeddings:", deleteError);
    return;
  }

  const batchSize = 20;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const rows = await Promise.all(
      batch.map(async (row) => {
        const content = buildContentChunk(row);
        const embedding = await getEmbedding(content);
        return {
          course_name: row["Course name"],
          course_link: row["Course link"],
          course_description: row["Course description"],
          price: row["Price"],
          starting_date: row["Starting date"],
          pace_type: row["Whether it is live or self-paced"],
          num_lessons: parseInt(row["Number of lessons"]) || null,
          duration_hours: parseInt(row["Total duration in number of hours"]) || null,
          target_audience: row["Who the course is meant for"],
          content,
          embedding,
        };
      })
    );

    const { error } = await supabase.from("course_embeddings").insert(rows);
    if (error) {
      console.error(`Error inserting batch starting at ${i}:`, error);
      return;
    }

    console.log(`Embedded ${Math.min(i + batchSize, records.length)}/${records.length} courses`);
  }

  console.log("Done! All courses embedded and stored in Supabase.");
}

main().catch(console.error);
