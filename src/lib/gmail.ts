interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractHeader(
  headers: { name: string; value: string }[],
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2] };
  }
  return { name: from, email: from };
}

function extractBody(
  payload: any
): { text: string; html: string } {
  let text = "";
  let html = "";

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/plain") text = decoded;
    if (payload.mimeType === "text/html") html = decoded;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result.text) text = result.text;
      if (result.html) html = result.html;
    }
  }

  return { text, html };
}

export async function fetchPrimaryEmails(
  accessToken: string,
  maxResults: number = 20
): Promise<GmailMessage[]> {
  // Fetch message IDs from primary inbox
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox+category:primary`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    throw new Error(`Gmail list error: ${listRes.status} ${err}`);
  }

  const listData = await listRes.json();
  const messageIds: { id: string }[] = listData.messages || [];

  if (messageIds.length === 0) return [];

  // Fetch full message details in parallel
  const messages = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) return null;

      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const fromRaw = extractHeader(headers, "From");
      const { name, email } = parseFrom(fromRaw);
      const subject = extractHeader(headers, "Subject");
      const date = extractHeader(headers, "Date");
      const { text, html } = extractBody(msg.payload);

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: email,
        fromName: name,
        subject,
        bodyText: text,
        bodyHtml: html,
        receivedAt: new Date(date).toISOString(),
      } as GmailMessage;
    })
  );

  return messages.filter((m): m is GmailMessage => m !== null);
}

export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId: string,
  messageId: string
): Promise<string> {
  const rawSubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  const email = [
    `To: ${to}`,
    `Subject: ${rawSubject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    body,
  ].join("\r\n");

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
        threadId,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.id;
}
