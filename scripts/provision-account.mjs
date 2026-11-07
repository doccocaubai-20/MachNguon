import { PGlite } from "@electric-sql/pglite";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buffer } from "node:stream/consumers";
import { hashPassword } from "../src/lib/auth/password.mjs";

const [, , rawEmail, rawName] = process.argv;
const email = rawEmail?.trim().toLowerCase();
const fullName = rawName?.trim();
if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || fullName.length > 120) {
  throw new Error('Cách dùng: node scripts/provision-account.mjs <email> "<họ và tên>". Truyền mật khẩu qua stdin.');
}
if (process.env.APP_ENV === "demo" || process.env.PG_IN_MEMORY === "true") {
  throw new Error("Hãy chọn cấu hình kho thật trước khi cấp tài khoản.");
}
const password = (await buffer(process.stdin)).toString("utf8").replace(/\r?\n$/, "");
if (password.length < 14 || password.length > 256) {
  throw new Error("Mật khẩu phải có từ 14 đến 256 ký tự.");
}
const hash = await hashPassword(password);
const dataDir = path.resolve(process.env.PG_DATA_DIR || path.join(process.env.MACH_NGUON_DATA_DIR || ".data", "pglite"));
await mkdir(dataDir, { recursive: true });
const db = new PGlite(dataDir);
try {
  await db.exec(await readFile(new URL("../src/lib/db/schema.sql", import.meta.url), "utf8"));
  await db.transaction(async (tx) => {
    const { rows } = await tx.query("SELECT id FROM profiles WHERE LOWER(email) = $1 LIMIT 2", [email]);
    if (rows.length > 1) throw new Error("Có nhiều hồ sơ trùng email. Hãy xử lý trùng trước khi cấp mật khẩu.");
    if (rows.length === 1) {
      await tx.query("UPDATE profiles SET password_hash = $1 WHERE id = $2", [hash, rows[0].id]);
      await tx.query("DELETE FROM user_sessions WHERE user_id = $1", [rows[0].id]);
    } else {
      await tx.query(
        "INSERT INTO profiles (email, full_name, password_hash) VALUES ($1, $2, $3)",
        [email, fullName, hash]
      );
    }
  });
  process.stdout.write("Đã cấp mật khẩu cho tài khoản.\n");
} finally {
  await db.close();
}
