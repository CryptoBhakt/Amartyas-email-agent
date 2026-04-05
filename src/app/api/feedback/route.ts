import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sentEmailId, starRating, feedbackText } = await req.json();

  if (!sentEmailId || !starRating) {
    return NextResponse.json(
      { error: "sentEmailId and starRating are required" },
      { status: 400 }
    );
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: feedback, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      sent_email_id: sentEmailId,
      user_id: user.id,
      star_rating: starRating,
      feedback_text: feedbackText || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback });
}
