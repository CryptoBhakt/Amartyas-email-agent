import { supabaseAdmin } from "./supabase";

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export async function getValidAccessToken(userEmail: string): Promise<string> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, google_access_token, google_refresh_token")
    .eq("email", userEmail)
    .single();

  if (!user) throw new Error("User not found");
  if (!user.google_refresh_token) throw new Error("No refresh token. Please re-login.");

  // Try using the current access token
  const testRes = await fetch(
    "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" +
      user.google_access_token
  );

  if (testRes.ok) {
    return user.google_access_token;
  }

  // Token expired — refresh it
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: user.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}. Please re-login.`);
  }

  const data: TokenResponse = await res.json();

  // Update the access token in Supabase
  await supabaseAdmin
    .from("users")
    .update({
      google_access_token: data.access_token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return data.access_token;
}
