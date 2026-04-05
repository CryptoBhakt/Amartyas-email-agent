import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchCourses, CourseMatch } from "./rag";

export type LLMProvider = "openai" | "gemini";

export interface PromptContext {
  systemPrompt: string;
  userPrompt: string;
  ragCoursesUsed: string;
  originalEmail: string;
  instructions: string;
}

function buildPromptParts(
  emailBody: string,
  emailSubject: string,
  fromName: string,
  courseContext: CourseMatch[]
): PromptContext {
  const ragCoursesUsed =
    courseContext.length > 0
      ? courseContext
          .map(
            (c) =>
              `- ${c.course_name} (${c.pace_type}, ${c.price})\n  ${c.course_description}\n  Starts: ${c.starting_date} | ${c.num_lessons} lessons, ${c.duration_hours}h\n  For: ${c.target_audience}\n  Link: ${c.course_link}`
          )
          .join("\n\n")
      : "No specific course matches found.";

  const systemPrompt =
    "You are a helpful email assistant for Vizuara, an online education platform offering courses in data analytics, AI, machine learning, and related fields. Your task is to draft a professional, friendly, and helpful reply to emails. Use the course information provided to give accurate details when relevant.";

  const originalEmail = `From: ${fromName}\nSubject: ${emailSubject}\nBody:\n${emailBody}`;

  const instructions = [
    `Address the sender as "Hi ${fromName}" (use the sender's name, never the replier's name)`,
    "Be warm, professional, and concise",
    "If the email asks about courses, recommend relevant ones from the course info with accurate details (price, dates, duration, link)",
    "If the email is not about courses, respond helpfully and appropriately",
    "Do not make up course information — only use what is provided",
    'Sign off with "Best regards,\\nAmartya"',
    "Write the reply in HTML format for email (use <p>, <br>, <ul>, <li> tags as needed)",
  ].join("\n- ");

  const userPrompt = `## Relevant Course Information (from RAG)\n${ragCoursesUsed}\n\n## Original Email\n${originalEmail}\n\n## Instructions\n- ${instructions}\n\nDraft the reply:`;

  return {
    systemPrompt,
    userPrompt,
    ragCoursesUsed,
    originalEmail,
    instructions: `- ${instructions}`,
  };
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });
  return response.choices[0].message.content || "";
}

async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
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
  promptContext: PromptContext;
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

  const promptContext = buildPromptParts(
    emailBody,
    emailSubject,
    fromName,
    courseContext
  );

  let draftBody: string;
  let model: string;

  if (provider === "gemini") {
    draftBody = stripCodeFences(
      await generateWithGemini(
        promptContext.systemPrompt,
        promptContext.userPrompt
      )
    );
    model = "gemini-1.5-flash";
  } else {
    draftBody = stripCodeFences(
      await generateWithOpenAI(
        promptContext.systemPrompt,
        promptContext.userPrompt
      )
    );
    model = "gpt-4o-mini";
  }

  return {
    draftBody,
    model,
    ragContext: courseContext,
    promptContext,
  };
}
