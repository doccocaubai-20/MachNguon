import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { AssetService } from "@/lib/server/asset.service";
import { ManualService } from "@/lib/server/manual.service";

describe("P07 - Tủ kinh nghiệm (ManualService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let assetService: AssetService;
  let manualService: ManualService;

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
    manualService = new ManualService(pglite);

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

    // Tạo kho gia đình
    const ws = await wsService.createWorkspace(adminUserId, {
      name: "Kho Ký Ức Gia Đình Họ Nguyễn",
    });
    wsId = ws.id;

    await wsService.addMemberDirectly(adminUserId, wsId, contributorUserId, "contributor");
    await wsService.addMemberDirectly(adminUserId, wsId, viewerUserId, "viewer");
    await wsService.addMemberDirectly(adminUserId, wsId, narratorUserId, "narrator");

    // Tạo file âm thanh mẫu
    const audio = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ba_mai_can_lua.mp3",
      file_path: "/uploads/ba_mai_can_lua.mp3",
      mime_type: "audio/mpeg",
      byte_size: 2500000,
      duration_seconds: 180,
      title: "Bà dặn căn lửa chảo dầu",
    });
    audioAssetId = audio.id;
  });

  it("1. Tạo cẩm nang thực hành với đầy đủ nguyên liệu, các bước & dấu hiệu làm đúng", async () => {
    const manual = await manualService.createManual(adminUserId, wsId, {
      title: "Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai",
      summary: "Hướng dẫn chi tiết từng công đoạn từ pha bột, nhào ủ đến căn nhiệt chảo mỡ.",
      ingredients: [
        { name: "Bột mì hoa ngọc lan", amount: "500g", category: "ingredient" },
        { name: "Nước ấm khoảng 40°C", amount: "220ml", category: "ingredient" },
        { name: "Đũa tre già", amount: "1 đôi", category: "tool", notes: "Dùng để thử độ sôi tăm tăm của mỡ" },
      ],
      steps: [
        {
          step_number: 1,
          title: "Pha và nhào ủ bột",
          instructions: "Hòa nước ấm với chút muối, đổ từ từ vào bột mì rồi nhào đều tay cho dẻo mịn. Bọc màng ủ 1 canh giờ.",
          success_signs: "Bột không dính tay, ấn ngón tay vào có độ đàn hồi trở lại.",
          evidence_asset_id: audioAssetId,
          evidence_quote: "Bột mì thì phải hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.",
          start_time_seconds: 30,
          end_time_seconds: 75,
        },
        {
          step_number: 2,
          title: "Căn lửa chảo mỡ và chiên giòn",
          instructions: "Đun mỡ nóng, thử đầu đũa sủi bọt tăm tăm thì thả bánh vào, lật đều 2 lần.",
          success_signs: "Vỏ bánh phồng căng xốp, màu vàng hổ phách, không bị ngấm mỡ.",
          evidence_asset_id: audioAssetId,
          evidence_quote: "Thử đầu đũa tre vào chảo mỡ thấy sủi bọt tăm tăm thì mới thả bánh.",
          start_time_seconds: 15,
          end_time_seconds: 55,
        },
      ],
    });

    expect(manual.id).toBeDefined();
    expect(manual.title).toBe("Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai");
    expect(manual.ingredients.length).toBe(3);
    expect(manual.steps.length).toBe(2);
    expect(manual.steps[0].success_signs).toBe("Bột không dính tay, ấn ngón tay vào có độ đàn hồi trở lại.");
    expect(manual.status).toBe("pending_approval");
  });

  it("2. Phê duyệt cẩm nang: Chỉ Narrator hoặc Admin mới duyệt được", async () => {
    const manual = await manualService.createManual(contributorUserId, wsId, {
      title: "Công thức pha nước chấm đu đủ",
      steps: [
        {
          step_number: 1,
          title: "Ngâm đu đủ và pha nước mắm",
          instructions: "Thái mỏng đu đủ xanh, ngâm giấm đường muối...",
          success_signs: "Đu đủ giòn sần sật, vị chua thanh ngọt dịu.",
        },
      ],
    });

    // 1. Viewer cố tình duyệt -> Bị từ chối
    await expect(
      manualService.approveManual(viewerUserId, wsId, manual.id)
    ).rejects.toThrow("Từ chối quyền");

    // 2. Contributor cố tình duyệt -> Bị từ chối
    await expect(
      manualService.approveManual(contributorUserId, wsId, manual.id)
    ).rejects.toThrow("Từ chối quyền");

    // 3. Người kể (Narrator) duyệt -> Thành công
    const approved = await manualService.approveManual(narratorUserId, wsId, manual.id);
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe(narratorUserId);
  });

  it("3. Góc hỏi đáp thực hành: Con cháu hỏi & Người truyền dạy giải đáp", async () => {
    const manual = await manualService.createManual(adminUserId, wsId, {
      title: "Bí quyết làm bánh của bà",
      steps: [
        {
          step_number: 1,
          title: "Ủ bột",
          instructions: "Ủ bột 1 tiếng.",
          success_signs: "Bột mịn.",
        },
      ],
    });

    // Phê duyệt cẩm nang trước khi chia sẻ cho Viewer
    await manualService.approveManual(adminUserId, wsId, manual.id);

    // 1. Người cháu (Viewer) gửi thắc mắc thực hành
    const note = await manualService.addPracticeNote(viewerUserId, wsId, {
      manual_id: manual.id,
      question: "Bà ơi nếu trời mùa đông lạnh thì ủ bột có cần để chỗ ấm hơn không?",
    });
    expect(note.id).toBeDefined();
    expect(note.question).toContain("mùa đông lạnh");
    expect(note.answer).toBeNull();

    // 2. Người kể (Narrator) trả lời câu hỏi
    const answeredNote = await manualService.answerPracticeNote(narratorUserId, wsId, {
      note_id: note.id,
      answer: "Mùa đông thì bọc khăn ấm hoặc để gần miệng nồi nước nóng nhé cháu.",
    });
    expect(answeredNote.answer).toContain("bọc khăn ấm");
    expect(answeredNote.answered_by_name).toBe("Bà Lê Thị Mai");

    // 3. Kiểm tra chi tiết cẩm nang trả về danh sách notes
    const manualDetail = await manualService.getManual(viewerUserId, wsId, manual.id);
    expect(manualDetail?.notes.length).toBe(1);
    expect(manualDetail?.notes[0].answer).toContain("bọc khăn ấm");
  });

  it("4. Cách ly kho gia đình: Người ngoài không xem được cẩm nang kho khác", async () => {
    const manual = await manualService.createManual(adminUserId, wsId, {
      title: "Bí quyết gia truyền tuyệt mật",
      steps: [
        {
          step_number: 1,
          title: "Bí kíp",
          instructions: "Chỉ người trong nhà mới được đọc.",
          success_signs: "Bí mật.",
        },
      ],
    });

    await expect(
      manualService.getManual(outsiderUserId, wsId, manual.id)
    ).rejects.toThrow("Truy cập bị từ chối");
  });
});
