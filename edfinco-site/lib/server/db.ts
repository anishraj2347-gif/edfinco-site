// Database access. Production: Postgres via DATABASE_URL (Render Postgres, or Neon).
// Local development: an embedded Postgres (PGlite) stored in .data/pglite — no account needed.
//
// Every query is parameterised ($1, $2 …); SQL is never built from user input. JSON columns are
// passed as JSON strings with an explicit ::jsonb cast so both drivers behave identically.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { SCHEMA_SQL } from "./schema";
import { seedIfNeeded } from "./seed";

export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}

// TLS is required for any database reached over the internet (Neon, Render's external URL).
// Two exceptions: this computer (localhost) uses none, and Render's private network, whose
// hostnames are a single label such as "dpg-abc123-a", uses TLS whenever the server offers it;
// that traffic never leaves Render's network.
function sslMode(url: string): false | "require" | "prefer" {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "require";
  }
  if (host === "localhost" || host === "127.0.0.1") return false;
  return host.includes(".") ? "require" : "prefer";
}

async function createDb(): Promise<Db> {
  if (config.databaseUrl) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(config.databaseUrl, {
      prepare: false, // works with Neon's pooled (pgbouncer) connection string
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: sslMode(config.databaseUrl),
      onnotice: () => {},
    });
    return {
      async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
        const rows = await sql.unsafe(text, params as never[]);
        return Array.from(rows) as T[];
      },
      async exec(text: string): Promise<void> {
        await sql.unsafe(text).simple();
      },
    };
  }

  if (config.isProd && !config.allowLocalDb) {
    throw new Error(
      "DATABASE_URL is not set. Connect a Postgres database (render.yaml does this on Render) before deploying."
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dataDir, { recursive: true }); // PGlite creates its folder but not missing parents
  const pg = new PGlite(path.join(dataDir, "pglite"));
  await pg.waitReady;
  return {
    async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
      return (await pg.query<T>(text, params)).rows;
    },
    async exec(text: string): Promise<void> {
      await pg.exec(text);
    },
  };
}

const g = globalThis as unknown as { __edfincoDb?: Promise<Db> };

/** The ready-to-use database (schema created, starter content imported). Cached per process. */
export function getDb(): Promise<Db> {
  if (!g.__edfincoDb) {
    g.__edfincoDb = (async () => {
      const db = await createDb();
      await db.exec(SCHEMA_SQL);
      await seedIfNeeded(db);
      return db;
    })().catch((err) => {
      g.__edfincoDb = undefined; // retry on the next request instead of caching the failure
      throw err;
    });
  }
  return g.__edfincoDb;
}

export const j = (value: unknown): string => JSON.stringify(value ?? null);
