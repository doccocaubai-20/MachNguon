import { fileURLToPath } from "node:url";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { DatabaseExecutor } from "./workspace.service";
import { seedDemoData } from "./seed";
import { dataRoot, demoMode } from "@/lib/auth/mode";

// Patch Node.js fs to prevent 'Received an instance of URL' errors across bundler/Next.js context realms
const processGlobal = globalThis as typeof globalThis & {
  __machNguonFsPatched?: boolean;
};

if (!processGlobal.__machNguonFsPatched) {
  processGlobal.__machNguonFsPatched = true;

  const toPathString = (p: unknown): unknown => {
    if (p && typeof p === "object") {
      const href = (p as { href?: unknown }).href;
      if (typeof href === "string" && href.startsWith("file:")) {
        try {
          return fileURLToPath(href);
        } catch {
          // ignore fallback
        }
      }
      const str = String(p);
      if (str.startsWith("file:")) {
        try {
          return fileURLToPath(str);
        } catch {
          // ignore fallback
        }
      }
    }
    return p;
  };

  const mutableFsp = fsp as unknown as Record<string, any>;
  const mutableFs = fs as unknown as Record<string, any>;

  const origFspReadFile = mutableFsp.readFile;
  if (typeof origFspReadFile === "function") {
    mutableFsp.readFile = function (path: any, ...args: any[]) {
      return origFspReadFile.call(this, toPathString(path), ...args);
    };
  }

  const origFsReadFileSync = mutableFs.readFileSync;
  if (typeof origFsReadFileSync === "function") {
    mutableFs.readFileSync = function (path: any, ...args: any[]) {
      return origFsReadFileSync.call(this, toPathString(path), ...args);
    };
  }
}

const processState = globalThis as typeof globalThis & {
  machNguonDb?: { pending: Promise<DatabaseExecutor> | null };
};
const database = (processState.machNguonDb ??= { pending: null });

async function runMigrations(db: DatabaseExecutor): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "src/lib/db/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await db.exec(schemaSql);

  // Ghi nhận phiên bản schema đã áp dụng
  await db.query(
    `INSERT INTO _schema_migrations (version) VALUES ('v1')
     ON CONFLICT (version) DO NOTHING`
  );
}

function wrapPGlite(pglite: PGlite): DatabaseExecutor {
  return {
    query: <T = any>(sql: string, params?: any[]) => pglite.query(sql, params) as unknown as Promise<{ rows: T[] }>,
    exec: (sql: string) => pglite.exec(sql),
    transaction: async <T>(fn: (tx: DatabaseExecutor) => Promise<T>): Promise<T> => {
      return pglite.transaction(async (tx) => {
        const txWrap: DatabaseExecutor = {
          query: <R = any>(q: string, p?: any[]) => tx.query(q, p) as unknown as Promise<{ rows: R[] }>,
          exec: (s: string) => tx.exec(s),
          transaction: (f) => f(txWrap),
        };
        return fn(txWrap);
      });
    },
  };
}

const globalForPg = globalThis as unknown as {
  __machNguonPgPool?: Pool;
};

function getOrCreatePool(connectionString: string): Pool {
  if (!globalForPg.__machNguonPgPool) {
    globalForPg.__machNguonPgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalForPg.__machNguonPgPool;
}

async function initializeDatabase(): Promise<DatabaseExecutor> {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const pool = getOrCreatePool(databaseUrl);

    const executor: DatabaseExecutor = {
      query: <T = any>(query: string, params?: any[]) => pool.query(query, params) as unknown as Promise<{ rows: T[] }>,
      exec: async (sql: string) => {
        await pool.query(sql);
      },
      transaction: async <T>(fn: (tx: DatabaseExecutor) => Promise<T>): Promise<T> => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const txExecutor: DatabaseExecutor = {
            query: <R = any>(q: string, p?: any[]) => client.query(q, p) as unknown as Promise<{ rows: R[] }>,
            exec: async (sql) => { await client.query(sql); },
            transaction: (nestedFn) => nestedFn(txExecutor),
          };
          const result = await fn(txExecutor);
          await client.query("COMMIT");
          return result;
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      },
    };

    try {
      // Kiểm tra xem schema đã được tạo hay chưa: nếu đã có 'v1' thì bỏ qua hoàn toàn DDL & seed
      let isInitialized = false;
      try {
        const check = await executor.query(
          "SELECT 1 FROM _schema_migrations WHERE version = 'v1'"
        );
        if (check.rows.length > 0) {
          isInitialized = true;
        }
      } catch {
        isInitialized = false;
      }

      if (!isInitialized) {
        await runMigrations(executor);
        if (demoMode || process.env.NODE_ENV !== "test") {
          await seedDemoData(executor);
        }
      }
      return executor;
    } catch (error) {
      console.error("FATAL POSTGRES DB INIT ERROR:", error);
      throw error;
    }
  }

  // Fallback to PGlite (local offline / test)
  const isMemory = process.env.PG_IN_MEMORY === "true" || process.env.NODE_ENV === "test";
  const dataDir = isMemory
    ? undefined
    : demoMode ? path.join(dataRoot, "pglite") : process.env.PG_DATA_DIR || path.join(dataRoot, "pglite");

  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const dbInstance = dataDir ? new PGlite(dataDir) : new PGlite();
  const executor = wrapPGlite(dbInstance);

  try {
    await runMigrations(executor);
    if (demoMode || process.env.NODE_ENV !== "test") await seedDemoData(executor);
    return executor;
  } catch (error) {
    console.error("FATAL DB INIT ERROR:", error);
    await dbInstance.close().catch(() => {});
    throw error;
  }
}

/**
 * Trả về instance DatabaseExecutor (Supabase Postgres hoặc PGlite) an toàn
 */
export async function getDb(): Promise<DatabaseExecutor> {
  if (!database.pending) {
    database.pending = initializeDatabase().catch((error) => {
      console.error("GET DB PENDING ERROR:", error);
      database.pending = null;
      throw error;
    });
  }
  return database.pending;
}

/**
 * Dành riêng cho testing khi cần khởi tạo lại instance
 */
export async function resetDbInstanceForTesting(): Promise<void> {
  const instance = await database.pending;
  if (instance && "close" in instance && typeof (instance as any).close === "function") {
    await (instance as any).close();
  }
  database.pending = null;
}
