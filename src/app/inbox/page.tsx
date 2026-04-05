"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function InboxPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Inbox</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            No emails yet. Gmail integration coming in Phase 3.
          </p>
        </div>
      </main>
    </>
  );
}
