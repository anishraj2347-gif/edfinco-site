import { connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import { requireStaff } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { personFor, ROLE_LABEL } from "@/lib/server/staff";
import styles from "../admin.module.css";

export default async function MyDetailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const staff = await requireStaff();
  const db = await getDb();
  const me = await personFor(db, staff.email);
  const q = await searchParams;
  const saved = q.msg === "saved";
  const error = typeof q.error === "string" ? q.error.slice(0, 200) : undefined;

  return (
    <>
      <AdminBar staff={staff} />
      <main id="main" className={`container ${styles.main}`}>
        <div className={styles.loginWrap} style={{ marginTop: 0 }}>
          <h1 className={styles.pageTitle}>My details</h1>
          <p className={styles.lede}>
            Your name and phone number are shown to the team on requests assigned to you and in reminder emails, so colleagues can
            reach you.
          </p>
          {saved && <p className={styles.flash}>Saved.</p>}
          {error && <p className={styles.flashError}>{error}</p>}
          {!me.name && !saved && <p className={styles.flashWarn}>Please add your name and phone number.</p>}
          <form action="/api/admin/me" method="post" className={`${styles.card} ${styles.form}`}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Full name
              </label>
              <input id="name" name="name" type="text" required minLength={2} maxLength={100} defaultValue={me.name} autoComplete="name" className={styles.input} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Email</span>
              <span className={styles.muted}>{staff.email} (this is your sign-in address)</span>
            </div>
            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                maxLength={20}
                defaultValue={me.phone}
                autoComplete="tel"
                inputMode="tel"
                placeholder="e.g. +91 98765 43210"
                className={styles.input}
              />
            </div>
            <p className={styles.small}>
              Access: {staff.isMain ? "Main admin (everything, approves new people)" : ROLE_LABEL[staff.role]}
            </p>
            <button type="submit" className="btn btn-primary">
              Save my details
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
