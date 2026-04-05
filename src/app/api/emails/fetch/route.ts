import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { fetchPrimaryEmails } from "@/lib/gmail";
import { getValidAccessToken } from "@/lib/google-auth";

export async function POST() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(session.user.email);
    const emails = await fetchPrimaryEmails(accessToken);
    return NextResponse.json({ emails });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
