import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : 0;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.sub as string;
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      // Upsert user in Supabase
      await supabaseAdmin.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          google_access_token: account.access_token,
          google_refresh_token: account.refresh_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };