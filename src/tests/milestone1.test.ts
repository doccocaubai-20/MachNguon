import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { hashPassword, verifyPassword } from "@/lib/auth/password.mjs";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { AssetService } from "@/lib/server/asset.service";
import { StoryService } from "@/lib/server/story.service";
import { TimelineService } from "@/lib/server/timeline.service";

describe("Chốt Mốc 1: P01 & P03 - Xác thực thật, Bảo vệ Kho & Cách ly Tài nguyên", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let personService: PersonService;
  let assetService: AssetService;
  let storyService: StoryService;
  let timelineService: TimelineService;

  const userA = "11111111-1111-1111-1111-111111111111"; // Admin kho A
  const userB = "22222222-2222-2222-2222-222222222222"; // Admin kho B
  const inviteeUser = "33333333-3333-3333-3333-333333333333";
  const wrongUser = "44444444-4444-4444-4444-444444444444";

  let wsAId: string;
  let wsBId: string;
  let personAId: string;
  let assetAId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    personService = new PersonService(pglite);
    assetService = new AssetService(pglite);
    storyService = new StoryService(pglite);
    timelineService = new TimelineService(pglite);

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, "../lib/db/schema.sql"),
      "utf-8"
    );
    await pglite.exec(schemaSql);

    // Chèn profiles
    await pglite.query(
      `INSERT INTO profiles (id, email, full_name) VALUES
       ($1, 'admin_a@giadinh.vn', 'Bác An Kho A'),
       ($2, 'admin_b@giadinh.vn', 'Bác Bình Kho B'),
       ($3, 'invitee@giadinh.vn', 'Cháu Đích Danh'),
       ($4, 'wrong@ngoaigia.vn', 'Người Nhận Sai Email')`,
      [userA, userB, inviteeUser, wrongUser]
    );

    // Tạo 2 kho A và B độc lập
    const wsA = await wsService.createWorkspace(userA, { name: "Kho Gia Đình Họ Nguyễn (A)" });
    wsAId = wsA.id;

    const wsB = await wsService.createWorkspace(userB, { name: "Kho Gia Đình Họ Trần (B)" });
    wsBId = wsB.id;

    // Tạo người thân và tư liệu thuộc Kho A
    const pA = await personService.createPerson(userA, {
      workspace_id: wsAId,
      full_name: "Cụ Nguyễn Văn Tiên",
      gender: "male",
      birth_date: "1910",
    });
    personAId = pA.id;

    const aA = await assetService.createAsset(userA, {
      workspace_id: wsAId,
      asset_type: "audio",
      file_name: "bang_ghi_am_kho_a.mp3",
      file_path: "/uploads/bang_a.mp3",
      mime_type: "audio/mpeg",
      byte_size: 1024,
      title: "Lời kể gia phả kho A",
    });
    assetAId = aA.id;
  });

  it("1. Chặn lỗi gắn ID người thân hoặc tư liệu kho A vào sự kiện kho B (Cross-workspace leak)", async () => {
    // Cố tình tạo Timeline Event ở Kho B nhưng truyền personId của Kho A
    await expect(
      timelineService.createEvent(userB, wsBId, {
        title: "Sự kiện kho B",
        year: 1970,
        date_display: "1970",
        date_precision: "year",
        person_ids: [personAId], // ID thuộc Kho A
      })
    ).rejects.toThrow("Người thân được chọn không thuộc kho gia đình này hoặc không tồn tại.");

    // Cố tình tạo Timeline Event ở Kho B nhưng truyền assetId của Kho A
    await expect(
      timelineService.createEvent(userB, wsBId, {
        title: "Sự kiện kho B với ảnh kho A",
        year: 1970,
        date_display: "1970",
        date_precision: "year",
        asset_ids: [assetAId], // ID thuộc Kho A
      })
    ).rejects.toThrow("Tư liệu được chọn không thuộc kho gia đình này hoặc không tồn tại.");

    // Cố tình tạo Story ở Kho B nhưng truyền primary_asset_id của Kho A
    await expect(
      storyService.createStory(userB, {
        workspace_id: wsBId,
        title: "Câu chuyện kho B",
        content: "Nội dung...",
        primary_asset_id: assetAId, // ID thuộc Kho A
      })
    ).rejects.toThrow("Tư liệu gốc được chọn không thuộc kho gia đình này hoặc không tồn tại.");
  });

  it("2. Kiểm tra token lời mời: Đích danh email, chống tái sử dụng (anti-replay), hết hạn", async () => {
    // Tạo lời mời đích danh cho invitee@giadinh.vn
    const { token } = await wsService.inviteMember(userA, {
      workspace_id: wsAId,
      email: "invitee@giadinh.vn",
      role: "contributor",
    });

    // Trường hợp 1: Người dùng có email khác cố tình chấp nhận token -> Bị từ chối
    await expect(
      wsService.acceptInvitation(wrongUser, token)
    ).rejects.toThrow("Lời mời này được gửi đích danh đến email 'invitee@giadinh.vn'");

    // Trường hợp 2: Người nhận đúng chấp nhận lời mời -> Thành công
    const mem = await wsService.acceptInvitation(inviteeUser, token);
    expect(mem.workspace_id).toBe(wsAId);
    expect(mem.user_id).toBe(inviteeUser);
    expect(mem.role).toBe("contributor");

    // Trường hợp 3: Thử dùng lại token lần thứ 2 (Anti-replay check) -> Bị từ chối
    await expect(
      wsService.acceptInvitation(inviteeUser, token)
    ).rejects.toThrow("Lời mời không tồn tại hoặc đã hết hạn/đã được sử dụng.");

    // Trường hợp 4: Lời mời đã hết hạn
    const expiredRes = await pglite.query<{ token: string }>(
      `INSERT INTO workspace_invitations (workspace_id, email, role, token, status, invited_by, expires_at)
       VALUES ($1, 'invitee@giadinh.vn', 'viewer', 'expired_token_123', 'pending', $2, NOW() - INTERVAL '1 day')
       RETURNING token`,
      [wsAId, userA]
    );

    await expect(
      wsService.acceptInvitation(inviteeUser, expiredRes.rows[0].token)
    ).rejects.toThrow("Lời mời đã hết hạn.");
  });

  it("3. Thu hồi quyền thành viên: Mất ngay lập tức quyền đọc và ghi", async () => {
    // Thêm inviteeUser vào kho A làm viewer
    const mem = await wsService.addMemberDirectly(userA, wsAId, inviteeUser, "viewer");

    // Invitee có thể xem kho
    const wsCheck = await wsService.getWorkspace(inviteeUser, wsAId);
    expect(wsCheck.workspace.id).toBe(wsAId);

    // Admin thu hồi quyền thành viên
    await wsService.revokeMember(userA, {
      workspace_id: wsAId,
      member_id: mem.id,
    });

    // Ngay lập tức không thể xem kho
    await expect(
      wsService.getWorkspace(inviteeUser, wsAId)
    ).rejects.toThrow("Truy cập bị từ chối");

    // Không còn nằm trong danh sách kho của user
    const list = await wsService.listUserWorkspaces(inviteeUser);
    expect(list.some((w) => w.id === wsAId)).toBe(false);
  });

  it("4. Tài khoản cũ chưa được cấp mật khẩu không xác thực được", async () => {
    const password = "mat-khau-dien-tap";
    const hash = await hashPassword(password);
    await expect(verifyPassword(password, null)).resolves.toBe(false);
    await expect(verifyPassword("sai-mat-khau", hash)).resolves.toBe(false);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });
});
