import { redirect } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { getStaff } from "@/lib/server/auth";
import { config } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { staffFor } from "@/lib/server/staff";
import styles from "../admin.module.css";

const MESSAGES: Record<string, { text: string; kind: "flash" | "flashError" | "flashWarn" }> = {
  out: { text: "You've signed out.", kind: "flash" },
  noaccess: { text: "That email doesn't have access. Ask the admin to add you on the Team page.", kind: "flashError" },
  wrong: { text: "Wrong password.", kind: "flashError" },
  rate: { text: "Too many attempts. Please wait an hour and try again.", kind: "flashError" },
  signin: { text: "Please sign in to continue.", kind: "flashWarn" },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getStaff()) redirect("/admin");
  const q = await searchParams;
  const email = typeof q.email === "string" ? q.email.trim().toLowerCase().slice(0, 254) : "";
  // Step 2 (password) only for the main admin or an email the admin has given access on /admin/team.
  const hasAccess = email ? Boolean(await staffFor(await getDb(), email)) : false;
  const key = q.out ? "out" : typeof q.error === "string" ? q.error : email && !hasAccess ? "noaccess" : "";
  const msg = MESSAGES[key];

  return (
    <>
      <AdminBar />
      <main id="main" className={`container ${styles.main}`}>
        <div className={styles.loginWrap}>
          <h1 className={styles.pageTitle}>Sign in</h1>
          <p className={styles.lede}>Sign in with your EdFinco staff email and password.</p>
          {msg && <p className={styles[msg.kind]}>{msg.text}</p>}
          {config.mainAdminEmails.length === 0 && (
            <p className={styles.flashWarn}>No main admin is set yet. Add MAIN_ADMIN_EMAILS to the server settings.</p>
          )}
          {hasAccess ? (
            <form action="/api/admin/login" method="post" className={`${styles.card} ${styles.form}`}>
              <div className={styles.field}>
                <span className={styles.label}>Staff email</span>
                <span className={styles.muted}>
                  {email} · <a href="/admin/login">Use a different email</a>
                </span>
                <input type="hidden" name="email" value={email} autoComplete="username" />
              </div>
              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" maxLength={200} className={styles.input} />
              </div>
              <button type="submit" className="btn btn-primary">
                Sign in
              </button>
            </form>
          ) : (
            <form action="/admin/login" method="get" className={`${styles.card} ${styles.form}`}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Staff email
                </label>
                <input id="email" name="email" type="email" required autoComplete="username" maxLength={254} defaultValue={email} className={styles.input} />
              </div>
              <button type="submit" className="btn btn-primary">
                Continue
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
