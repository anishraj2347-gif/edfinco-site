import Image from "next/image";
import BlogMarkdown from "@/components/BlogMarkdown";
import { parseBlocks } from "@/lib/markdown";
import type { Checks } from "@/lib/server/post-checks";
import type { PostRow } from "@/lib/server/posts";
import styles from "@/app/admin/admin.module.css";

/** How a draft will look on the blog (same renderer as the public post page). */
export function PostPreview({ post }: { post: PostRow }) {
  return (
    <article className={styles.preview} aria-label="Draft preview">
      {post.image && (
        <div className={styles.previewImg}>
          <Image src={post.image} alt={post.image_alt ?? ""} width={1200} height={800} sizes="(max-width: 960px) 100vw, 760px" />
        </div>
      )}
      <span className={styles.eyebrow}>{post.tags[0] ?? "Guide"}</span>
      <h2 className={styles.previewTitle}>{post.title}</h2>
      <p className={styles.previewDesc}>{post.description}</p>
      <BlogMarkdown blocks={parseBlocks(post.body)} />
      {post.sources.length > 0 && (
        <>
          <p className={styles.small}>
            <strong>Sources the writer used</strong> (not shown on the site):
          </p>
          <ul className={`${styles.list} ${styles.small}`}>
            {post.sources.map((s) => (
              <li key={s}>
                <a href={s} target="_blank" rel="noopener noreferrer">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

export function ChecksBox({ checks }: { checks: Checks | null }) {
  if (!checks) return null;
  const items = [...checks.errors, ...checks.warnings];
  if (!items.length) {
    return <p className={styles.checksOk}>Automatic compliance checks passed, with nothing flagged ({checks.wordCount} words).</p>;
  }
  return (
    <div className={styles.checksWarn}>
      <strong>Please double-check before approving</strong> ({checks.wordCount} words):
      <ul>
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
