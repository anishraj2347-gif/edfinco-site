"use client";

// The review chat on /review/<token>: the admin talks to the AI writer in plain words, the writer
// answers with a new version, and the page refreshes itself when that version arrives. Works without
// JavaScript too (the forms post normally and redirect back). Only same-origin requests are made.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/admin/admin.module.css";

export interface ChatMessage {
  id: string;
  who: "writer" | "editor" | "system";
  text: string;
  meta?: string;
}

interface Props {
  token: string;
  version: number;
  status: string;
  messages: ChatMessage[];
  /** Go-live wording for the Approve button, e.g. "Tue 18 Nov, 7:00 am". */
  when: string;
  feedbackError?: boolean;
}

const POLL_MS = 6000;
const GIVE_UP_MS = 40 * 60 * 1000;

export default function ReviewChat({ token, version, status, messages, when, feedbackError }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(feedbackError ? "Please describe the change (5 to 4000 characters)." : "");
  const [sent, setSent] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(status === "revising" || status === "writing");
  const [slow, setSlow] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const base = `/api/review/${encodeURIComponent(token)}`;
  const canAct = status === "pending_review" && !waiting;

  // Keep the newest message in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sent, waiting]);

  // While the writer works, check every few seconds whether the new version has arrived.
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      if (Date.now() - started > GIVE_UP_MS) {
        setSlow(true);
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`${base}/status`, { cache: "no-store", headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; version?: number };
        if (data.version !== version || (data.status !== "revising" && data.status !== "writing")) {
          stopped = true;
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // Offline for a moment: try again on the next tick.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waiting, base, version, router]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const feedback = text.trim();
    if (feedback.length < 5 || feedback.length > 4000) {
      setError("Please describe the change (5 to 4000 characters).");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({ action: "changes", version: String(version), feedback }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; stale?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSent(feedback);
        setText("");
        setWaiting(true);
      } else if (data.stale) {
        setError(data.error ?? "This draft has changed. Reloading.");
        router.refresh();
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Couldn't reach the website. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="chat" className={styles.chat} aria-labelledby="chat-title">
      <div className={styles.chatHead}>
        <h2 id="chat-title" className={styles.cardTitle}>
          Chat with the writer
        </h2>
        <p className={styles.small}>Ask for any change in your own words. Each new version takes a few minutes and appears here by itself.</p>
      </div>

      <ol ref={logRef} className={styles.chatLog} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.who === "editor" ? styles.msgEditor : m.who === "system" ? styles.msgSystem : styles.msgWriter}>
            {m.who !== "system" && <span className={styles.msgWho}>{m.who === "editor" ? "Editor" : "Writer"}</span>}
            <p className={styles.msgText}>{m.text}</p>
            {m.meta && <span className={styles.msgMeta}>{m.meta}</span>}
          </li>
        ))}
        {sent && (
          <li className={styles.msgEditor}>
            <span className={styles.msgWho}>Editor</span>
            <p className={styles.msgText}>{sent}</p>
            <span className={styles.msgMeta}>Just now</span>
          </li>
        )}
        {waiting && (
          <li className={styles.msgWriter}>
            <span className={styles.msgWho}>Writer</span>
            <p className={styles.msgText}>
              {slow
                ? "This is taking longer than usual. The new version will also arrive by email, or check the dashboard."
                : `Working on version ${version + 1}. This usually takes 2 to 5 minutes. You can leave this page open or come back later from the email.`}
            </p>
          </li>
        )}
      </ol>

      {error && (
        <p className={styles.flashError} role="alert">
          {error}
        </p>
      )}

      {canAct && (
        <>
          <form action={base} method="post" onSubmit={send} className={styles.chatForm}>
            <input type="hidden" name="action" value="changes" />
            <input type="hidden" name="version" value={version} />
            <label htmlFor="chat-input" className={styles.label}>
              What should change?
            </label>
            <textarea
              id="chat-input"
              name="feedback"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
              }}
              required
              minLength={5}
              maxLength={4000}
              rows={3}
              className={styles.textarea}
              placeholder="e.g. Make the intro shorter and add a section on what to ask the lender."
            />
            <div className={styles.spread}>
              <span className={styles.small}>Ctrl + Enter to send</span>
              <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`} disabled={sending}>
                {sending ? "Sending..." : "Send to the writer"}
              </button>
            </div>
          </form>

          <form id="approve" action={base} method="post" className={styles.chatApprove}>
            <input type="hidden" name="action" value="approve" />
            <input type="hidden" name="version" value={version} />
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Approve version {version} for {when}
            </button>
            <p className={styles.small}>Nothing is published unless you approve it.</p>
          </form>
        </>
      )}
    </section>
  );
}
