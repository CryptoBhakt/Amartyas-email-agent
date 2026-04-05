import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get sent emails with their drafts and feedback
  const { data: sentEmails, error } = await supabaseAdmin
    .from("sent_emails")
    .select(`
      id,
      gmail_message_id,
      from_email,
      subject,
      final_body,
      sent_at,
      draft_id,
      drafts (
        id,
        ai_draft_body,
        model_used,
        from_name,
        original_body,
        created_at
      ),
      feedback (
        star_rating,
        feedback_text
      )
    `)
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: sentEmails });
}
