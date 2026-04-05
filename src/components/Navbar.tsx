"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/inbox" className="text-lg font-bold text-gray-900">
          Vizuara Email Agent
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/inbox"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Inbox
          </Link>
          <Link
            href="/history"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            History
          </Link>
          <span className="text-sm text-gray-500">{session.user.email}</span>
          {session.user.image && (
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
