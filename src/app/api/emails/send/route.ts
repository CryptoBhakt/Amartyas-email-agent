import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendGmailReply } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    draftId,
    gmailMessageId,
    gmailThreadId,
    fromEmail,
    subject,
    finalBody,
  } = await req.json();

  if (!gmailMessageId || !fromEmail || !finalBody) {
    return NextResponse.json(
      { error: "gmailMessageId, fromEmail, and finalBody are required" },
      { status: 400 }
    );
  }

  // Get user with tokens
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, google_access_token")
    .eq("email", session.user.email)
    .single();

  if (!user?.google_access_token) {
    return NextResponse.json(
      { error: "No access token. Please re-login." },
      { status: 401 }
    );
  }

  try {
    // Send via Gmail
    const gmailSentId = await sendGmailReply(
      user.google_access_token,
      fromEmail,
      subject || "",
      finalBody,
      gmailThreadId,
      gmailMessageId
    );

    // Store sent email in Supabase
    const { data: sentEmail, error: sentError } = await supabaseAdmin
      .from("sent_emails")
      .insert({
        draft_id: draftId || null,
        user_id: user.id,
        gmail_message_id: gmailMessageId,
        gmail_thread_id: gmailThreadId,
        from_email: fromEmail,
        subject: subject,
        final_body: finalBody,
        gmail_sent_message_id: gmailSentId,
      })
      .select()
      .single();

    if (sentError) {
      return NextResponse.json({ error: sentError.message }, { status: 500 });
    }

    return NextResponse.json({ sentEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
