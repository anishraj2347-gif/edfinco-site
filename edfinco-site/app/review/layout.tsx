import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "@/app/admin/admin.module.css";

// Review links carry a secret token in the URL: never index. "same-origin" means the URL is never
// sent to other sites (e.g. the post's source links), while our own form posts keep their Origin.
export const metadata: Metadata = {
  title: "Review a blog post · EdFinco",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
