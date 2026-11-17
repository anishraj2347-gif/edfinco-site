"use client";

import { useState } from "react";

/** Copies the text of the element with `targetId` (e.g. a read-only textarea) to the clipboard. */
export default function CopyButton({ targetId, label = "Copy", className }: { targetId: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
    } catch {
      el.select(); // Clipboard blocked: select the text so Ctrl + C works.
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {done ? "Copied" : label}
    </button>
  );
}
