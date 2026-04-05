"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";

interface Email {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
}

interface Draft {
  id: string;
  ai_draft_body: string;
  model_used: string;
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Draft state
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [llmProvider, setLlmProvider] = useState<"openai" | "gemini">("openai");

  // Send state
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sentEmailId, setSentEmailId] = useState<string | null>(null);

  // Editor state
  const [showPreview, setShowPreview] = useState(false);

  // Feedback state
  const [starRating, setStarRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

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

  async function fetchEmails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/fetch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmails(data.emails);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft() {
    if (!selectedEmail) return;
    setDraftLoading(true);
    setError(null);
    setDraft(null);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailMessageId: selectedEmail.id,
          gmailThreadId: selectedEmail.threadId,
          fromEmail: selectedEmail.from,
          fromName: selectedEmail.fromName,
          subject: selectedEmail.subject,
          bodyText: selectedEmail.bodyText,
          bodyHtml: selectedEmail.bodyHtml,
          provider: llmProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.draft);
      setEditedDraft(data.draft.ai_draft_body);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedEmail || !draft) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          gmailMessageId: selectedEmail.id,
          gmailThreadId: selectedEmail.threadId,
          fromEmail: selectedEmail.from,
          subject: selectedEmail.subject,
          finalBody: editedDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendSuccess(true);
      setSentEmailId(data.sentEmail.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function submitFeedback() {
    if (!sentEmailId || starRating === 0) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentEmailId,
          starRating,
          feedbackText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedbackSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFeedbackLoading(false);
    }
  }

  function selectEmail(email: Email) {
    setSelectedEmail(email);
    setDraft(null);
    setEditedDraft("");
    setSendSuccess(false);
    setSentEmailId(null);
    setStarRating(0);
    setFeedbackText("");
    setFeedbackSubmitted(false);
    setShowPreview(false);
    setError(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Fetching..." : "Fetch Emails"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Email list */}
          <div className="w-1/3 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {emails.length === 0 && !loading && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">
                  Click &quot;Fetch Emails&quot; to load your inbox.
                </p>
              </div>
            )}
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => selectEmail(email)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedEmail?.id === email.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {email.fromName || email.from}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">
                  {email.subject || "(no subject)"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(email.receivedAt)}
                </p>
              </button>
            ))}
          </div>

          {/* Email detail + draft */}
          <div className="flex-1 space-y-4">
            {selectedEmail ? (
              <>
                {/* Original email */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedEmail.subject || "(no subject)"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      From: {selectedEmail.fromName}{" "}
                      &lt;{selectedEmail.from}&gt;
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(selectedEmail.receivedAt)}
                    </p>
                  </div>
                  <div className="prose prose-sm max-w-none max-h-60 overflow-y-auto">
                    {selectedEmail.bodyHtml ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: selectedEmail.bodyHtml,
                        }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedEmail.bodyText}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Draft controls */}
                {!sendSuccess && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-semibold text-gray-900">
                        AI Draft Reply
                      </h3>
                      <div className="flex items-center gap-3">
                        <select
                          value={llmProvider}
                          onChange={(e) =>
                            setLlmProvider(
                              e.target.value as "openai" | "gemini"
                            )
                          }
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Gemini</option>
                        </select>
                        <button
                          onClick={generateDraft}
                          disabled={draftLoading}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          {draftLoading
                            ? "Generating..."
                            : draft
                            ? "Regenerate"
                            : "Generate Reply"}
                        </button>
                      </div>
                    </div>

                    {draft && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-400">
                            Model: {draft.model_used}
                          </p>
                          <div className="flex rounded-md border border-gray-300 overflow-hidden">
                            <button
                              onClick={() => setShowPreview(false)}
                              className={`px-3 py-1 text-xs font-medium ${
                                !showPreview
                                  ? "bg-gray-900 text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              Edit HTML
                            </button>
                            <button
                              onClick={() => setShowPreview(true)}
                              className={`px-3 py-1 text-xs font-medium ${
                                showPreview
                                  ? "bg-gray-900 text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                        {showPreview ? (
                          <div
                            className="w-full rounded-lg border border-gray-300 p-4 text-sm prose prose-sm max-w-none min-h-[12rem] max-h-80 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: editedDraft }}
                          />
                        ) : (
                          <textarea
                            value={editedDraft}
                            onChange={(e) => setEditedDraft(e.target.value)}
                            rows={12}
                            className="w-full rounded-lg border border-gray-300 p-4 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            Review and edit the draft, then click Send to
                            approve.
                          </p>
                          {sendSuccess ? (
                            <span className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                              Sent!
                            </span>
                          ) : (
                            <button
                              onClick={sendReply}
                              disabled={sending}
                              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {sending ? "Sending..." : "Approve & Send"}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {sendSuccess && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                    <p className="text-green-700 font-medium text-center mb-4">
                      Reply sent successfully!
                    </p>

                    {!feedbackSubmitted ? (
                      <div className="border-t border-green-200 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Rate this reply:
                        </p>
                        <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setStarRating(star)}
                              className={`text-2xl transition-colors ${
                                star <= starRating
                                  ? "text-yellow-400"
                                  : "text-gray-300 hover:text-yellow-300"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                          {starRating > 0 && (
                            <span className="ml-2 text-sm text-gray-500">
                              {starRating}/5
                            </span>
                          )}
                        </div>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Optional: share feedback on this reply..."
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-3"
                        />
                        <button
                          onClick={submitFeedback}
                          disabled={starRating === 0 || feedbackLoading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {feedbackLoading
                            ? "Submitting..."
                            : "Submit Feedback"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center border-t border-green-200 pt-4">
                        Thanks for your feedback!
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-400">Select an email to view</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
