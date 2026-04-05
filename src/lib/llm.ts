import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchCourses, CourseMatch } from "./rag";

export type LLMProvider = "openai" | "gemini";

function buildPrompt(
  emailBody: string,
  emailSubject: string,
  fromName: string,
  courseContext: CourseMatch[]
): string {
  const courseInfo =
    courseContext.length > 0
      ? courseContext
          .map(
            (c) =>
              `- ${c.course_name} (${c.pace_type}, ${c.price})\n  ${c.course_description}\n  Starts: ${c.starting_date} | ${c.num_lessons} lessons, ${c.duration_hours}h\n  For: ${c.target_audience}\n  Link: ${c.course_link}`
          )
          .join("\n\n")
      : "No specific course matches found.";

  return `You are a helpful email assistant for Vizuara, an online education platform offering courses in data analytics, AI, machine learning, and related fields.

Your task is to draft a professional, friendly, and helpful reply to the following email. Use the course information below to provide accurate details when relevant.

## Relevant Course Information
${courseInfo}

## Original Email
From: ${fromName}
Subject: ${emailSubject}
Body:
${emailBody}

## Instructions
- Address the sender as "Hi ${fromName}" (use the sender's name, never the replier's name)
- Be warm, professional, and concise
- If the email asks about courses, recommend relevant ones from the course info above with accurate details (price, dates, duration, link)
- If the email is not about courses, respond helpfully and appropriately
- Do not make up course information — only use what is provided above
- Sign off with "Best regards,\nAmartya"
- Write the reply in HTML format for email (use <p>, <br>, <ul>, <li> tags as needed)

Draft the reply:`;
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content || "";
}

async function generateWithGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```html\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

export interface DraftResult {
  draftBody: string;
  model: string;
  ragContext: CourseMatch[];
  prompt: string;
}

export async function generateDraft(
  emailBody: string,
  emailSubject: string,
  fromName: string,
  provider: LLMProvider = "openai"
): Promise<DraftResult> {
  // RAG: search for relevant courses
  const searchQuery = `${emailSubject} ${emailBody}`.slice(0, 500);
  const courseContext = await searchCourses(searchQuery, 5, 0.3);

  const prompt = buildPrompt(emailBody, emailSubject, fromName, courseContext);

  let draftBody: string;
  let model: string;

  if (provider === "gemini") {
    draftBody = stripCodeFences(await generateWithGemini(prompt));
    model = "gemini-1.5-flash";
  } else {
    draftBody = stripCodeFences(await generateWithOpenAI(prompt));
    model = "gpt-4o-mini";
  }

  return {
    draftBody,
    model,
    ragContext: courseContext,
    prompt,
  };
}
