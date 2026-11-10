// Public blog loader — server-only. Posts live in the database (lib/server/posts.ts); the public
// site shows ONLY posts an admin approved whose go-live time has passed. The three launch posts
// are imported from content/blog/*.md on first run (lib/server/seed.ts).
//
// Security: slugs are validated before any lookup; Markdown is parsed into a typed block list
// and rendered by components/BlogMarkdown.tsx — raw HTML is never rendered.
import { getDb } from "@/lib/server/db";
import { getLiveBySlug, listLive, type PostRow } from "@/lib/server/posts";
import { istDate } from "@/lib/server/schedule";
import { parseBlocks, readingMinutes, type Block } from "@/lib/markdown";

export type { Block };

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD (India) — the day it went live
  author: string;
  tags: string[];
  image?: string;
  imageAlt?: string;
  readingMinutes: number;
}

export interface Post extends PostMeta {
  blocks: Block[];
}

function toMeta(p: PostRow): PostMeta {
  const image = p.image ?? "";
  return {
    slug: p.slug ?? "",
    title: p.title,
    description: p.description,
    date: p.publish_at ? istDate(p.publish_at) : istDate(p.created_at),
    author: "EdFinco Team",
    tags: p.tags,
    image: image.startsWith("/") && !image.startsWith("//") ? image : undefined,
    imageAlt: p.image_alt ?? "",
    readingMinutes: readingMinutes(p.body),
  };
}

/** All live posts, newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  const db = await getDb();
  return (await listLive(db)).filter((p) => p.slug).map(toMeta);
}

/** A single live post, or null (not approved yet / scheduled for later / missing / invalid slug). */
export async function getPost(slug: string): Promise<Post | null> {
  const db = await getDb();
  const p = await getLiveBySlug(db, slug);
  return p ? { ...toMeta(p), blocks: parseBlocks(p.body) } : null;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
