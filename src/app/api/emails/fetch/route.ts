import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { fetchPrimaryEmails } from "@/lib/gmail";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's access token from Supabase
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, google_access_token")
    .eq("email", session.user.email)
    .single();

  if (userError || !user?.google_access_token) {
    return NextResponse.json(
      { error: "No access token found. Please re-login." },
      { status: 401 }
    );
  }

  try {
    const emails = await fetchPrimaryEmails(user.google_access_token);
    return NextResponse.json({ emails });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
