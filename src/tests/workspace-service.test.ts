import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";

describe("P01 - Kho gia đình & Phân quyền (WorkspaceService)", () => {
  let pglite: PGlite;
  let service: WorkspaceService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  beforeEach(async () => {
    pglite = new PGlite();
    service = new WorkspaceService(pglite);

    // Chạy DDL schema
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, "../lib/db/schema.sql"),
      "utf-8"
    );
    await pglite.exec(schemaSql);

    // Chèn dữ liệu mẫu cho profiles
    await pglite.query(
      `INSERT INTO profiles (id, email, full_name) VALUES
       ($1, 'admin@giadinh.vn', 'Nguyễn Văn Admin'),
       ($2, 'contributor@giadinh.vn', 'Trần Thị Contributor'),
       ($3, 'viewer@giadinh.vn', 'Lê Văn Viewer'),
       ($4, 'outsider@ngoaigia.vn', 'Người Ngoài Gia Đình')`,
      [adminUserId, contributorUserId, viewerUserId, outsiderUserId]
    );
  });

  it("1. Tạo kho gia đình: người tạo tự động là Quản trị viên (admin)", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Gia đình họ Nguyễn",
      description: "Lưu giữ ký ức và kinh nghiệm của ông bà",
    });

    expect(ws.id).toBeDefined();
    expect(ws.name).toBe("Gia đình họ Nguyễn");

    const { workspace, currentMember } = await service.getWorkspace(adminUserId, ws.id);
    expect(workspace.id).toBe(ws.id);
    expect(currentMember.role).toBe("admin");
    expect(currentMember.status).toBe("active");

    // Kiểm tra audit log
    const auditRes = await pglite.query<{ action: string }>(
      `SELECT action FROM audit_events WHERE workspace_id = $1`,
      [ws.id]
    );
    expect(auditRes.rows.some((r) => r.action === "WORKSPACE_CREATED")).toBe(true);
  });

  it("2. Cách ly kho gia đình (Isolation): Người ngoài không được phép truy cập", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Kho riêng gia đình A",
    });

    await expect(
      service.getWorkspace(outsiderUserId, ws.id)
    ).rejects.toThrow("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
  });

  it("3. Phân quyền mời: Chỉ Admin mới có quyền mời thành viên, Viewer không có quyền", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Gia đình đoàn tụ",
    });

    // Admin thêm viewer vào kho
    await service.addMemberDirectly(adminUserId, ws.id, viewerUserId, "viewer");

    // Kiểm tra viewer đã là thành viên active
    const { currentMember } = await service.getWorkspace(viewerUserId, ws.id);
    expect(currentMember.role).toBe("viewer");

    // Viewer cố tình mời người khác -> Bị từ chối quyền
    await expect(
      service.inviteMember(viewerUserId, {
        workspace_id: ws.id,
        email: "outsider@ngoaigia.vn",
        role: "viewer",
      })
    ).rejects.toThrow("Từ chối quyền: Vai trò 'viewer' không có quyền 'member:invite'.");
  });

  it("4. Chấp nhận lời mời và cấp quyền thành viên", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Kho ký ức",
    });

    const { token } = await service.inviteMember(adminUserId, {
      workspace_id: ws.id,
      email: "outsider@ngoaigia.vn",
      role: "contributor",
    });

    expect(token).toBeDefined();

    // Outsider chấp nhận lời mời bằng token
    const membership = await service.acceptInvitation(outsiderUserId, token);
    expect(membership.workspace_id).toBe(ws.id);
    expect(membership.user_id).toBe(outsiderUserId);
    expect(membership.role).toBe("contributor");
    expect(membership.status).toBe("active");

    // Bây giờ outsider đã là thành viên hợp lệ của kho
    const { currentMember } = await service.getWorkspace(outsiderUserId, ws.id);
    expect(currentMember.role).toBe("contributor");
  });

  it("5. Thay đổi vai trò thành viên & bảo vệ Admin duy nhất", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Kho dòng tộc",
    });

    // Admin thêm contributor vào kho
    await service.addMemberDirectly(adminUserId, ws.id, contributorUserId, "contributor");

    const mems = await service.getWorkspaceMembers(adminUserId, ws.id);
    const contributorMem = mems.find((m) => m.user_id === contributorUserId)!;
    const adminMem = mems.find((m) => m.user_id === adminUserId)!;

    // Admin thăng hạng contributor lên admin
    const promoted = await service.updateMemberRole(adminUserId, {
      workspace_id: ws.id,
      member_id: contributorMem.id,
      role: "admin",
    });
    expect(promoted.role).toBe("admin");

    // Bây giờ kho có 2 admin, admin đầu tiên có thể đổi vai trò xuống contributor
    const demoted = await service.updateMemberRole(adminUserId, {
      workspace_id: ws.id,
      member_id: adminMem.id,
      role: "contributor",
    });
    expect(demoted.role).toBe("contributor");

    // Cố hạ cấp admin duy nhất còn lại -> Bị chặn
    await expect(
      service.updateMemberRole(contributorUserId, {
        workspace_id: ws.id,
        member_id: contributorMem.id,
        role: "viewer",
      })
    ).rejects.toThrow("Kho gia đình phải có ít nhất 1 Quản trị viên (admin).");
  });

  it("6. Thu hồi quyền thành viên: Mất ngay quyền truy cập kho", async () => {
    const ws = await service.createWorkspace(adminUserId, {
      name: "Kho gia đình",
    });

    // Thêm contributor
    await service.addMemberDirectly(adminUserId, ws.id, contributorUserId, "contributor");

    // Contributor đang truy cập được
    const before = await service.getWorkspace(contributorUserId, ws.id);
    expect(before.currentMember.status).toBe("active");

    const mems = await service.getWorkspaceMembers(adminUserId, ws.id);
    const contributorMem = mems.find((m) => m.user_id === contributorUserId)!;

    // Admin thu hồi quyền
    const revoked = await service.revokeMember(adminUserId, {
      workspace_id: ws.id,
      member_id: contributorMem.id,
    });
    expect(revoked.status).toBe("revoked");

    // Sau khi bị thu hồi, cố truy cập -> Bị chặn ngay lập tức
    await expect(
      service.getWorkspace(contributorUserId, ws.id)
    ).rejects.toThrow("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
  });
});
