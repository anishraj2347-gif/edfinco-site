import AdminBar from "@/components/AdminBar";
import styles from "../../admin.module.css";

// The emailed link lands here. Signing in needs one click (a POST), so an email scanner that
// pre-fetches the link can't use it up or sign anyone in.
export default async function VerifyLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const token = typeof q.token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(q.token) ? q.token : "";

  return (
    <>
      <AdminBar />
      <main id="main" className={`container ${styles.main}`}>
        <div className={styles.loginWrap}>
          <h1 className={styles.pageTitle}>Sign in to the blog admin</h1>
          {token ? (
            <form action="/api/admin/login/verify" method="post" className={`${styles.card} ${styles.form}`}>
              <input type="hidden" name="token" value={token} />
              <p className={styles.muted}>Click below to finish signing in on this device.</p>
              <button type="submit" className="btn btn-primary">
                Sign in
              </button>
            </form>
          ) : (
            <p className={styles.flashError}>
              This sign-in link isn&apos;t valid. <a href="/admin/login">Request a new one</a>.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
