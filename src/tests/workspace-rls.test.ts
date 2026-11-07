import { describe, it, expect, beforeEach } from "vitest";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

describe("P01 - Kiểm chứng bảo mật tầng dữ liệu (PostgreSQL RLS Policies)", () => {
  let pglite: PGlite;

  const userA = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userB = "22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const userC = "33333333-cccc-cccc-cccc-cccccccccccc";

  beforeEach(async () => {
    pglite = new PGlite();

    // Thiết lập role authenticated giống chuẩn Supabase
    await pglite.exec(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END
      $$;
      GRANT USAGE ON SCHEMA public TO authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
    `);

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, "../lib/db/schema.sql"),
      "utf-8"
    );
    await pglite.exec(schemaSql);
    await pglite.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;`);

    // Chèn profiles với quyền superuser ban đầu
    await pglite.query(
      `INSERT INTO profiles (id, email, full_name) VALUES
       ($1, 'usera@giadinh.vn', 'Gia đình A - Chủ hộ'),
       ($2, 'userb@giadinh.vn', 'Gia đình B - Chủ hộ'),
       ($3, 'userc@giadinh.vn', 'Khách C')`,
      [userA, userB, userC]
    );
  });

  const runAsUser = async <T = any>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> => {
    return pglite.transaction(async (tx) => {
      await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      await tx.exec(`SET LOCAL ROLE authenticated`);
      return fn(tx);
    });
  };

  it("1. RLS ngăn chặn truy cập chéo giữa 2 kho gia đình độc lập (Cross-workspace isolation)", async () => {
    // Tạo Kho A (do userA tạo)
    const wsARes = await pglite.query<{ id: string }>(
      `INSERT INTO workspaces (name, created_by) VALUES ('Kho Gia Đình A', $1) RETURNING id`,
      [userA]
    );
    const wsAId = wsARes.rows[0].id;
    await pglite.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status) VALUES ($1, $2, 'admin', 'active')`,
      [wsAId, userA]
    );

    // Tạo Kho B (do userB tạo)
    const wsBRes = await pglite.query<{ id: string }>(
      `INSERT INTO workspaces (name, created_by) VALUES ('Kho Gia Đình B', $1) RETURNING id`,
      [userB]
    );
    const wsBId = wsBRes.rows[0].id;
    await pglite.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status) VALUES ($1, $2, 'admin', 'active')`,
      [wsBId, userB]
    );

    // Truy vấn dưới danh nghĩa userA
    const resA = await runAsUser(userA, async (tx) => {
      const res = await tx.query<{ id: string; name: string }>(`SELECT id, name FROM workspaces`);
      return res.rows;
    });
    expect(resA.length).toBe(1);
    expect(resA[0].id).toBe(wsAId);

    // Truy vấn dưới danh nghĩa userB
    const resB = await runAsUser(userB, async (tx) => {
      const res = await tx.query<{ id: string; name: string }>(`SELECT id, name FROM workspaces`);
      return res.rows;
    });
    expect(resB.length).toBe(1);
    expect(resB[0].id).toBe(wsBId);

    // Truy vấn dưới danh nghĩa userC (không thuộc kho nào)
    const resC = await runAsUser(userC, async (tx) => {
      const res = await tx.query<{ id: string; name: string }>(`SELECT id, name FROM workspaces`);
      return res.rows;
    });
    expect(resC.length).toBe(0); // RLS bảo vệ: 0 dòng trả về
  });

  it("2. Khi thành viên bị thu hồi quyền (revoked), RLS lập tức chặn nhìn thấy kho", async () => {
    // Tạo Kho A
    const wsRes = await pglite.query<{ id: string }>(
      `INSERT INTO workspaces (name, created_by) VALUES ('Kho Gia Đình A', $1) RETURNING id`,
      [userA]
    );
    const wsId = wsRes.rows[0].id;

    // Admin A
    await pglite.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status) VALUES ($1, $2, 'admin', 'active')`,
      [wsId, userA]
    );

    // Member C (active)
    await pglite.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status) VALUES ($1, $2, 'viewer', 'active')`,
      [wsId, userC]
    );

    // Khi C còn active: nhìn thấy kho
    const beforeRevoke = await runAsUser(userC, async (tx) => {
      const res = await tx.query<{ id: string }>(`SELECT id FROM workspaces WHERE id = $1`, [wsId]);
      return res.rows;
    });
    expect(beforeRevoke.length).toBe(1);

    // Admin thu hồi quyền của C: status = 'revoked'
    await pglite.query(
      `UPDATE memberships SET status = 'revoked' WHERE workspace_id = $1 AND user_id = $2`,
      [wsId, userC]
    );

    // Sau khi thu hồi: C truy vấn kho -> RLS trả về 0 dòng ngay lập tức
    const afterRevoke = await runAsUser(userC, async (tx) => {
      const res = await tx.query<{ id: string }>(`SELECT id FROM workspaces WHERE id = $1`, [wsId]);
      return res.rows;
    });
    expect(afterRevoke.length).toBe(0);
  });
});
