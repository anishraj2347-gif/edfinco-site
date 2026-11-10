import { isLive, STATUS_LABEL, type PostRow } from "@/lib/server/posts";
import styles from "@/app/admin/admin.module.css";

export default function StatusBadge({ post }: { post: PostRow }) {
  if (isLive(post)) return <span className={`${styles.badge} ${styles.badge_live}`}>Live</span>;
  const label = post.status === "approved" ? "Approved, scheduled" : STATUS_LABEL[post.status];
  return <span className={`${styles.badge} ${styles[`badge_${post.status}`] ?? ""}`}>{label}</span>;
}
