"use client";

// Friendly fallback if a page fails to render. Never shows error details to visitors (they're in
// the server logs); offers a retry and a way home.
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main" className="section">
      <div className="container" style={{ maxWidth: 640, textAlign: "center", paddingBlock: "64px" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.3rem)", lineHeight: 1.2, color: "var(--forest)", marginBottom: 14 }}>
          Something went wrong on our side.
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 26 }}>
          Please try again. If it keeps happening, email us at hello@edfinco.com.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}
