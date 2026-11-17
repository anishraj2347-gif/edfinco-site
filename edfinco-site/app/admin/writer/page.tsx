import { connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import CopyButton from "@/components/CopyButton";
import { requireAdmin } from "@/lib/server/auth";
import { config } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { routinePrompt } from "@/lib/server/routine-prompt";
import { formatIst } from "@/lib/server/schedule";
import { writerStatus } from "@/lib/server/writer-connection";
import styles from "../admin.module.css";

const MESSAGES: Record<string, string> = {
  saved: "Connected. Press \"Send a test run\" to check it end to end.",
  disconnected: "Disconnected. No new drafts will be written until a writer is connected again.",
  tested: "Claude accepted the test run. You'll see a short run in your Claude routines list that replies \"Connection test received.\"",
};

// The AI writer is a Claude Code routine in the owner's own Claude account, on their Claude Pro
// plan. Anthropic doesn't allow other websites to offer a claude.ai sign-in, so the owner signs in
// on claude.ai, creates the routine there, and connects it here with its API trigger.
export default async function WriterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const admin = await requireAdmin();
  const q = await searchParams;
  const db = await getDb();
  const status = await writerStatus(db);
  const host = new URL(config.appUrl).host;
  const prompt = routinePrompt(config.appUrl);
  const msg = typeof q.msg === "string" ? MESSAGES[q.msg] : undefined;
  const error = typeof q.error === "string" ? q.error.slice(0, 300) : "";
  const canEdit = admin.isMain;

  return (
    <>
      <AdminBar staff={admin} current="writer" />
      <main id="main" className={`container ${styles.main}`}>
        <h1 className={styles.pageTitle}>Claude writer</h1>
        <p className={styles.lede}>
          The blog writer is Claude, running as a <strong>routine in your own Claude account on your Claude Pro plan</strong>, so there is no
          API key and no charge per article. You sign in to Claude on claude.ai (Anthropic doesn&apos;t let other websites offer a Claude
          sign-in), create the routine there once, and connect it here.
        </p>
        {msg && <p className={styles.flash}>{msg}</p>}
        {error && <p className={styles.flashError}>{error}</p>}
        {!canEdit && <p className={styles.flashWarn}>Only a main admin can connect or change the writer. You can see its status here.</p>}

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="status-title">
            <h2 id="status-title" className={styles.cardTitle}>
              Status
            </h2>
            <p>
              <span className={status.connected ? styles.dotOn : styles.dotOff} aria-hidden="true" />{" "}
              <strong>{status.connected ? "Connected" : status.needsReconnect ? "Needs reconnecting" : "Not connected"}</strong>
            </p>
            {status.connected && (
              <dl className={styles.kv}>
                <dt>Routine</dt>
                <dd>{status.routineId}</dd>
                <dt>Token</dt>
                <dd>ending {status.tokenHint}</dd>
                {status.source === "env" && (
                  <>
                    <dt>Set in</dt>
                    <dd>server settings (ROUTINE_FIRE_URL / ROUTINE_FIRE_TOKEN), which take priority over this page</dd>
                  </>
                )}
                {status.connectedBy && (
                  <>
                    <dt>Connected by</dt>
                    <dd>
                      {status.connectedBy}
                      {status.connectedAt ? `, ${formatIst(status.connectedAt)}` : ""}
                    </dd>
                  </>
                )}
                {status.lastTestAt && (
                  <>
                    <dt>Last test</dt>
                    <dd>
                      {status.lastTestOk ? "worked" : "failed"}, {formatIst(status.lastTestAt)}
                      {status.lastTestSession && (
                        <>
                          {" "}
                          (
                          <a href={status.lastTestSession} target="_blank" rel="noopener noreferrer">
                            see the run on claude.ai
                          </a>
                          )
                        </>
                      )}
                    </dd>
                  </>
                )}
              </dl>
            )}
            {status.needsReconnect && (
              <p className={styles.small}>A connection was saved, but the server&apos;s encryption key has changed since. Paste the URL and token again.</p>
            )}
            {!status.connected && !config.isProd && (
              <p className={styles.small}>On this laptop, drafts go to the local test writer (scripts/dev-worker.mjs) until a routine is connected.</p>
            )}
            {canEdit && status.connected && (
              <div className={styles.row} style={{ marginTop: 12 }}>
                <form action="/api/admin/writer" method="post">
                  <input type="hidden" name="action" value="test" />
                  <button type="submit" className="btn btn-primary">
                    Send a test run
                  </button>
                </form>
                {status.source === "dashboard" && (
                  <form action="/api/admin/writer" method="post">
                    <input type="hidden" name="action" value="disconnect" />
                    <button type="submit" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                      Disconnect
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>

          {canEdit && status.source !== "env" && (
            <section className={styles.card} aria-labelledby="connect-title">
              <h2 id="connect-title" className={styles.cardTitle}>
                {status.connected ? "Replace the connection" : "Connect your routine"}
              </h2>
              {status.canSave ? (
                <form action="/api/admin/writer" method="post" className={styles.form}>
                  <input type="hidden" name="action" value="save" />
                  <div className={styles.field}>
                    <label htmlFor="url" className={styles.label}>
                      API trigger URL
                    </label>
                    <input
                      id="url"
                      name="url"
                      type="url"
                      required
                      className={styles.input}
                      placeholder="https://api.anthropic.com/v1/claude_code/routines/.../fire"
                      pattern="https://api\.anthropic\.com/v1/claude_code/routines/[A-Za-z0-9_\-]+/fire"
                      autoComplete="off"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="token" className={styles.label}>
                      API trigger token
                    </label>
                    <input id="token" name="token" type="password" required minLength={20} maxLength={512} className={styles.input} autoComplete="off" />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Connect
                  </button>
                  <p className={styles.small}>
                    The token is stored encrypted and is never shown again. It is only ever sent to Anthropic&apos;s routine address.
                  </p>
                </form>
              ) : (
                <p className={styles.flashWarn}>Set SECRETS_KEY (or CRON_SECRET) on the host first, so the token can be stored encrypted.</p>
              )}
            </section>
          )}
        </div>

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="steps-title" style={{ marginTop: 24 }}>
          <h2 id="steps-title" className={styles.cardTitle}>
            How to set it up (once)
          </h2>
          <ol className={styles.list}>
            <li>
              Open{" "}
              <a href="https://claude.ai/code/routines" target="_blank" rel="noopener noreferrer">
                claude.ai/code/routines
              </a>{" "}
              and sign in with the Claude account that has the Pro plan.
            </li>
            <li>
              Create a cloud environment for the routine. Set its network access to <strong>Custom</strong> and allow only{" "}
              <strong>{host}</strong>, so the writer can reach this website and nothing else.
            </li>
            <li>Create a new routine in that environment, with no connectors, and paste the prompt below as its instructions.</li>
            <li>Add an <strong>API trigger</strong> to the routine and copy its URL and token.</li>
            <li>Paste them into &quot;Connect your routine&quot; on this page, press Connect, then press &quot;Send a test run&quot;.</li>
          </ol>
          <div className={styles.field} style={{ marginTop: 12 }}>
            <div className={styles.spread}>
              <label htmlFor="routine-prompt" className={styles.label}>
                Routine prompt (this website&apos;s address is already filled in)
              </label>
              <CopyButton targetId="routine-prompt" label="Copy the prompt" className={`btn ${styles.btnGhost} ${styles.btnSm}`} />
            </div>
            <textarea id="routine-prompt" readOnly rows={14} className={styles.textarea} value={prompt} />
          </div>
          <p className={styles.small}>
            Each draft and each change you ask for in the review chat starts one short run on the Pro plan, which counts toward its usage
            limits. The writing rules themselves live on this website, so the prompt never needs editing when the rules change.
          </p>
        </section>
      </main>
    </>
  );
}
