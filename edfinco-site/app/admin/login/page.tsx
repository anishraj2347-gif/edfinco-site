import { redirect } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { getStaff } from "@/lib/server/auth";
import { config } from "@/lib/server/config";
import styles from "../admin.module.css";

const MESSAGES: Record<string, { text: string; kind: "flash" | "flashError" | "flashWarn" }> = {
  sent: { text: "If that email has access, a sign-in link is on its way. It works once and expires in 15 minutes.", kind: "flash" },
  out: { text: "You've signed out.", kind: "flash" },
  email: { text: "Enter a valid email address.", kind: "flashError" },
  rate: { text: "Too many attempts. Please wait an hour and try again.", kind: "flashError" },
  expired: { text: "That sign-in link has expired or was already used. Request a new one.", kind: "flashError" },
  signin: { text: "Please sign in to continue.", kind: "flashWarn" },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getStaff()) redirect("/admin");
  const q = await searchParams;
  const key = q.sent ? "sent" : q.out ? "out" : typeof q.error === "string" ? q.error : "";
  const msg = MESSAGES[key];

  return (
    <>
      <AdminBar />
      <main id="main" className={`container ${styles.main}`}>
        <div className={styles.loginWrap}>
          <h1 className={styles.pageTitle}>Sign in</h1>
          <p className={styles.lede}>
            Enter your EdFinco staff email and we&apos;ll send you a one-time sign-in link. No password needed.
          </p>
          {msg && <p className={styles[msg.kind]}>{msg.text}</p>}
          {config.mainAdminEmails.length === 0 && (
            <p className={styles.flashWarn}>No main admin is set yet. Add MAIN_ADMIN_EMAILS to the server settings.</p>
          )}
          <form action="/api/admin/login" method="post" className={`${styles.card} ${styles.form}`}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Staff email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} className={styles.input} />
            </div>
            <button type="submit" className="btn btn-primary">
              Email me a sign-in link
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
