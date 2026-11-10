import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

// The admin area is private: never indexed, never cached. "same-origin" sends the referrer only to
// this site (never to external links), and keeps the Origin header on our own form posts.
export const metadata: Metadata = {
  title: "Admin · EdFinco",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
