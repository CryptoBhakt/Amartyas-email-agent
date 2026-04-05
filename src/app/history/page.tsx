"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";

interface HistoryItem {
  id: string;
  gmail_message_id: string;
  from_email: string;
  subject: string;
  final_body: string;
  sent_at: string;
  drafts: {
    id: string;
    ai_draft_body: string;
    model_used: string;
    from_name: string;
    original_body: string;
    created_at: string;
  } | null;
  feedback: {
    star_rating: number;
    feedback_text: string;
  }[];
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [viewMode, setViewMode] = useState<"sent" | "draft" | "diff">("sent");

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

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistory(data.history);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Load on first render
  if (history.length === 0 && !loading && !error) {
    fetchHistory();
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reply History</h1>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* History list */}
          <div className="w-1/3 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {history.length === 0 && !loading && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">No sent replies yet.</p>
              </div>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setViewMode("sent");
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedItem?.id === item.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    To: {item.from_email}
                  </span>
                  {item.feedback?.[0] && (
                    <span className="text-xs text-yellow-500">
                      {"★".repeat(item.feedback[0].star_rating)}
                      {"☆".repeat(5 - item.feedback[0].star_rating)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">
                  {item.subject || "(no subject)"}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {formatDate(item.sent_at)}
                  </p>
                  {item.drafts && (
                    <span className="text-xs text-gray-400">
                      via {item.drafts.model_used}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail view */}
          <div className="flex-1">
            {selectedItem ? (
              <div className="space-y-4">
                {/* View toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
                  {(
                    [
                      ["sent", "Sent Reply"],
                      ["draft", "AI Draft"],
                      ["diff", "Side by Side"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-2 text-sm font-medium ${
                        viewMode === mode
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Original email */}
                {selectedItem.drafts?.original_body && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Original Email from{" "}
                      {selectedItem.drafts.from_name || selectedItem.from_email}
                    </h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedItem.drafts.original_body}
                    </pre>
                  </div>
                )}

                {/* Content based on view mode */}
                {viewMode === "sent" && (
                  <div className="rounded-xl border border-green-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-green-700 mb-3">
                      Sent Reply
                    </h3>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: selectedItem.final_body,
                      }}
                    />
                  </div>
                )}

                {viewMode === "draft" && selectedItem.drafts && (
                  <div className="rounded-xl border border-blue-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-blue-700 mb-3">
                      AI Draft ({selectedItem.drafts.model_used})
                    </h3>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: selectedItem.drafts.ai_draft_body,
                      }}
                    />
                  </div>
                )}

                {viewMode === "diff" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-blue-200 bg-white p-6">
                      <h3 className="text-sm font-semibold text-blue-700 mb-3">
                        AI Draft
                      </h3>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedItem.drafts?.ai_draft_body ||
                            "<p>No draft available</p>",
                        }}
                      />
                    </div>
                    <div className="rounded-xl border border-green-200 bg-white p-6">
                      <h3 className="text-sm font-semibold text-green-700 mb-3">
                        Sent Reply
                      </h3>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: selectedItem.final_body,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {selectedItem.feedback?.[0] && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-lg">
                        {"★".repeat(selectedItem.feedback[0].star_rating)}
                        {"☆".repeat(5 - selectedItem.feedback[0].star_rating)}
                      </span>
                      {selectedItem.feedback[0].feedback_text && (
                        <span className="text-sm text-gray-600">
                          — {selectedItem.feedback[0].feedback_text}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-400">Select a reply to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
