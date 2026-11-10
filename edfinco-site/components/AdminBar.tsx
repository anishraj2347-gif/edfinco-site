import Link from "next/link";
import type { Staff } from "@/lib/server/staff";
import styles from "@/app/admin/admin.module.css";

type Section = "leads" | "blog" | "team";

/** Top bar for the admin pages (server component; sign-out is a plain same-origin form POST). */
export default function AdminBar({ staff, current }: { staff?: Staff | null; current?: Section }) {
  const links: { key: Section; href: string; label: string }[] = staff
    ? [
        { key: "leads", href: "/admin/leads", label: "Consultation requests" },
        ...(staff.role === "admin"
          ? [
              { key: "blog" as const, href: "/admin", label: "Blog" },
              { key: "team" as const, href: "/admin/team", label: "Team & access" },
            ]
          : []),
      ]
    : [];
  return (
    <header className={styles.topbar}>
      <div className={`container ${styles.topbarInner}`}>
        <Link href={staff ? "/admin/leads" : "/"} className={styles.brand}>
          EdFinco <span className={styles.brandTag}>{staff?.role === "team" ? "Team" : "Admin"}</span>
        </Link>
        {links.length > 0 && (
          <nav aria-label="Dashboard" className={styles.nav}>
            {links.map((l) => (
              <Link key={l.key} href={l.href} className={styles.navLink} aria-current={current === l.key ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {staff && (
          <div className={styles.who}>
            <Link href="/admin/me" className={styles.navLink} title="My details (name and phone)">
              {staff.email}
              {staff.isMain ? " · main admin" : ""}
            </Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className={styles.linkBtn}>
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
