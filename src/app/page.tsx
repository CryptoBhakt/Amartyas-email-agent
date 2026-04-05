"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (session) {
    redirect("/inbox");
  } else {
    redirect("/login");
  }
}
