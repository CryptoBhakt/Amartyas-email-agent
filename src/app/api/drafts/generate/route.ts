import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateDraft, LLMProvider } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    gmailMessageId,
    gmailThreadId,
    fromEmail,
    fromName,
    subject,
    bodyText,
    bodyHtml,
    provider = "openai",
  } = await req.json();

  if (!gmailMessageId || !fromEmail) {
    return NextResponse.json(
      { error: "gmailMessageId and fromEmail are required" },
      { status: 400 }
    );
  }

  // Get user
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const emailBody = bodyText || bodyHtml || "";
    const result = await generateDraft(
      emailBody,
      subject || "",
      fromName || fromEmail,
      provider as LLMProvider
    );

    // Save draft to Supabase (with original email context)
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .insert({
        user_id: user.id,
        gmail_message_id: gmailMessageId,
        gmail_thread_id: gmailThreadId,
        from_email: fromEmail,
        from_name: fromName,
        subject: subject,
        original_body: emailBody,
        ai_draft_body: result.draftBody,
        model_used: result.model,
        rag_context: result.ragContext,
        prompt_used: JSON.stringify(result.promptContext),
      })
      .select()
      .single();

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 });
    }

    return NextResponse.json({
      draft: {
        ...draft,
        prompt_context: result.promptContext,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
