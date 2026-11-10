// Shared Markdown helpers for blog posts (used by the public blog, the admin review screens,
// the approval emails and the seed importer).
//
// Security: Markdown is parsed into a small typed block list. It is rendered by
// components/BlogMarkdown.tsx (React elements) and lib/server/email-templates.ts (escaped HTML) —
// raw HTML in a post is never rendered anywhere.

export type Block =
  | { type: "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] };

/** Parses the `key: value` frontmatter block used by content/blog/*.md (seed files). */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w]*):\s*(.*?)\s*$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value.startsWith("[")) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = [];
      }
    } else {
      data[key] = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    }
  }
  return { data, body: m[2] };
}

/** Parses the supported Markdown subset (## / ### headings, paragraphs, lists, > quotes). */
export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara();
      flushList();
      blocks.push({ type: m[1].length === 2 ? "h2" : "h3", text: m[2] });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      flushList();
      blocks.push({ type: "quote", text: m[1] });
    } else if ((m = line.match(/^[-*]\s+(.*)$/)) || (m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara();
      const type = /^\d/.test(line) ? "ol" : "ul";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(m[1]);
    } else if (line.startsWith("#")) {
      // A stray H1 in the body: demote to H2 (the title is the page's only H1).
      flushPara();
      flushList();
      blocks.push({ type: "h2", text: line.replace(/^#+\s*/, "") });
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export function wordCount(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(wordCount(body) / 200));
}

/** Inline syntax shared by the renderers: **bold** and [text](href). A fresh RegExp per call
 *  (global regexes carry lastIndex state, so one must never be shared between renders). */
export function inlineRegex(): RegExp {
  return /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
}

/** Only same-origin paths, #anchors and https:// links are ever turned into links. */
export function safeHref(href: string): { href: string; external: boolean } | null {
  if (/^\/(?!\/)/.test(href) || href.startsWith("#")) return { href, external: false };
  if (/^https:\/\/[^\s]+$/i.test(href)) return { href, external: true };
  return null;
}
