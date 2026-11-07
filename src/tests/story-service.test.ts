import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { AssetService } from "@/lib/server/asset.service";
import { StoryService } from "@/lib/server/story.service";

describe("P04 - Câu chuyện có nguồn & Quản lý phiên bản (StoryService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let assetService: AssetService;
  let storyService: StoryService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const narratorUserId = "44444444-4444-4444-4444-444444444444";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  let wsId: string;
  let audioAssetId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    assetService = new AssetService(pglite);
    storyService = new StoryService(pglite);

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, "../lib/db/schema.sql"),
      "utf-8"
    );
    await pglite.exec(schemaSql);

    // Chèn profiles
    await pglite.query(
      `INSERT INTO profiles (id, email, full_name) VALUES
       ($1, 'admin@giadinh.vn', 'Bác Nguyễn Văn An'),
       ($2, 'contributor@giadinh.vn', 'Nguyễn Thanh Bình'),
       ($3, 'viewer@giadinh.vn', 'Nguyễn Mai Châu'),
       ($4, 'narrator@giadinh.vn', 'Bà Lê Thị Mai'),
       ($5, 'outsider@ngoaigia.vn', 'Người Ngoài Gia Đình')`,
      [adminUserId, contributorUserId, viewerUserId, narratorUserId, outsiderUserId]
    );

    // Tạo kho
    const ws = await wsService.createWorkspace(adminUserId, {
      name: "Kho Ký Ức Gia Đình",
    });
    wsId = ws.id;

    await wsService.addMemberDirectly(adminUserId, wsId, contributorUserId, "contributor");
    await wsService.addMemberDirectly(adminUserId, wsId, viewerUserId, "viewer");
    await wsService.addMemberDirectly(adminUserId, wsId, narratorUserId, "narrator");

    // Tạo file âm thanh gốc
    const audio = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ba_ke_banh_goi.mp3",
      file_path: "/uploads/ba_ke_banh_goi.mp3",
      mime_type: "audio/mpeg",
      byte_size: 4000000,
      duration_seconds: 240,
      title: "Bản ghi âm bà kể chuyện làm bánh",
    });
    audioAssetId = audio.id;
  });

  it("1. Tạo câu chuyện có nguồn và gắn bằng chứng mốc thời gian", async () => {
    const story = await storyService.createStory(contributorUserId, {
      workspace_id: wsId,
      primary_asset_id: audioAssetId,
      title: "Ký ức gánh bánh gối phố cổ của bà",
      summary: "Lời kể về những ngày gánh bánh rong quanh chợ Đồng Xuân thời bao cấp.",
      content: "Năm 1965, bà bắt đầu gánh hàng bánh gối từ ngõ nhỏ ra bán ở góc phố cổ...",
      category: "ẩm thực",
      status: "pending_approval",
    });

    expect(story.id).toBeDefined();
    expect(story.status).toBe("pending_approval");

    // Thêm trích dẫn bằng chứng vào mốc giây 45 đến 75
    await storyService.addEvidenceRef(contributorUserId, wsId, {
      story_id: story.id,
      asset_id: audioAssetId,
      start_time_seconds: 45,
      end_time_seconds: 75,
      quote_text: "Hồi ấy bột mì hiếm lắm, phải trộn khéo với nước ấm thì vỏ mới giòn xốp.",
    });

    const detail = await storyService.getStory(contributorUserId, wsId, story.id);
    expect(detail.evidence_refs.length).toBe(1);
    expect(Number(detail.evidence_refs[0].start_time_seconds)).toBe(45);
    expect(detail.evidence_refs[0].quote_text).toContain("Hồi ấy bột mì hiếm lắm");
  });

  it("2. Lưu và đọc bản chép lời (Transcript Segments) có mốc thời gian", async () => {
    await storyService.saveTranscriptSegments(adminUserId, wsId, audioAssetId, [
      { order: 1, startTime: 0, endTime: 15, text: "Bà nhớ ngày xưa gánh hàng đi từ sáng sớm tinh sương." },
      { order: 2, startTime: 15, endTime: 45, text: "Trời mùa đông rét căm căm nhưng chảo mỡ sôi xèo xèo ấm cả góc phố." },
    ]);

    const segments = await storyService.getTranscript(viewerUserId, wsId, audioAssetId);
    expect(segments.length).toBe(2);
    expect(segments[0].segment_order).toBe(1);
    expect(Number(segments[0].start_time_seconds)).toBe(0);
    expect(Number(segments[1].start_time_seconds)).toBe(15);
  });

  it("3. Phê duyệt câu chuyện: Chỉ Người kể (Narrator) hoặc Admin mới duyệt được", async () => {
    const story = await storyService.createStory(contributorUserId, {
      workspace_id: wsId,
      title: "Chuyện gánh hàng của bà",
      content: "Nội dung đang chờ bà duyệt...",
      status: "pending_approval",
    });

    // Contributor cố tình tự duyệt -> Bị từ chối quyền
    await expect(
      storyService.approveStory(contributorUserId, wsId, story.id)
    ).rejects.toThrow("Từ chối quyền: Vai trò 'contributor' không có quyền 'story:approve'.");

    // Người kể (Narrator) duyệt nội dung -> Thành công
    const approved = await storyService.approveStory(narratorUserId, wsId, story.id);
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe(narratorUserId);
  });

  it("4. Cách ly kho: Người ngoài không xem được câu chuyện của kho khác", async () => {
    const story = await storyService.createStory(adminUserId, {
      workspace_id: wsId,
      title: "Bí mật gia đình",
      content: "Nội dung riêng tư của gia đình họ Nguyễn",
    });

    await expect(
      storyService.getStory(outsiderUserId, wsId, story.id)
    ).rejects.toThrow("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
  });
});
