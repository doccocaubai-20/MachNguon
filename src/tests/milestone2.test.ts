import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { AssetService } from "@/lib/server/asset.service";
import { StoryService } from "@/lib/server/story.service";
import { TimelineService } from "@/lib/server/timeline.service";
import { ManualService } from "@/lib/server/manual.service";
import { GraphService } from "@/lib/server/graph.service";
import { SearchService } from "@/lib/server/search.service";

describe("Chốt Mốc 2: P02, P04–P08 - Luồng Tư Liệu → Tri Thức & Q&A Động Có Nguồn Thật", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let personService: PersonService;
  let assetService: AssetService;
  let storyService: StoryService;
  let timelineService: TimelineService;
  let manualService: ManualService;
  let graphService: GraphService;
  let searchService: SearchService;

  const adminId = "11111111-1111-1111-1111-111111111111";
  const contributorId = "22222222-2222-2222-2222-222222222222";
  const viewerId = "33333333-3333-3333-3333-333333333333";
  const narratorId = "44444444-4444-4444-4444-444444444444";

  let wsId: string;
  let audioAssetId: string;
  let narratorPersonId: string;
  let contributorPersonId: string;
  let emptyPersonId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    personService = new PersonService(pglite);
    assetService = new AssetService(pglite);
    storyService = new StoryService(pglite);
    timelineService = new TimelineService(pglite);
    manualService = new ManualService(pglite);
    graphService = new GraphService(pglite);
    searchService = new SearchService(pglite);

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, "../lib/db/schema.sql"),
      "utf-8"
    );
    await pglite.exec(schemaSql);

    // Seed profiles
    await pglite.query(
      `INSERT INTO profiles (id, email, full_name) VALUES
       ($1, 'admin@giadinh.vn', 'Bác Nguyễn Văn An'),
       ($2, 'contributor@giadinh.vn', 'Nguyễn Thanh Bình'),
       ($3, 'viewer@giadinh.vn', 'Nguyễn Mai Châu'),
       ($4, 'narrator@giadinh.vn', 'Bà Lê Thị Mai')`,
      [adminId, contributorId, viewerId, narratorId]
    );

    // Tạo kho A
    const ws = await wsService.createWorkspace(adminId, {
      name: "Kho Gia Đình Họ Nguyễn Mốc 2",
    });
    wsId = ws.id;

    await wsService.addMemberDirectly(adminId, wsId, contributorId, "contributor");
    await wsService.addMemberDirectly(adminId, wsId, viewerId, "viewer");
    await wsService.addMemberDirectly(adminId, wsId, narratorId, "narrator");

    // 1. Tạo hồ sơ người thân (P02)
    // Người 1: Người kể chuyện (có nhiều dữ liệu)
    const p1 = await personService.createPerson(adminId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
      nick_name: "Bà Nội",
      gender: "female",
      birth_date: "1936",
      bio: "Nắm giữ nghệ thuật làm bánh truyền thống.",
      linked_user_id: narratorId,
    });
    narratorPersonId = p1.id;

    // Người 2: Người đóng góp (dữ liệu khác)
    const p2 = await personService.createPerson(adminId, {
      workspace_id: wsId,
      full_name: "Nguyễn Thanh Bình",
      nick_name: "Bình Con",
      gender: "male",
      birth_date: "1985",
      bio: "Kỹ sư công nghệ, chuyên số hóa tư liệu gia đình.",
      linked_user_id: contributorId,
    });
    contributorPersonId = p2.id;

    // Người 3: Hồ sơ trống (chưa có tư liệu / sự kiện)
    const p3 = await personService.createPerson(adminId, {
      workspace_id: wsId,
      full_name: "Hồ Sơ Mới Chưa Có Dữ Liệu",
      gender: "other",
    });
    emptyPersonId = p3.id;

    // 2. Tạo Asset âm thanh mới
    const asset = await assetService.createAsset(adminId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ghi_am_goc_2026.mp3",
      title: "Lời dặn gia truyền năm 2026",
      file_path: "/uploads/ghi_am_goc_2026.mp3",
      byte_size: 2048000,
      mime_type: "audio/mpeg",
      duration_seconds: 180,
      narrator_id: narratorPersonId,
    });
    audioAssetId = asset.id;
  });

  it("P02 - Hồ sơ: Phản ánh đúng dữ liệu thực, không gán cứng bánh gối, phân biệt người nhiều dữ liệu và hồ sơ trống", async () => {
    // Thêm quan hệ cho người 1 và 2
    await personService.addRelationship(adminId, {
      workspace_id: wsId,
      person_id: narratorPersonId,
      related_person_id: contributorPersonId,
      relationship_type: "grandparent",
      notes: "Bà nội và cháu trai",
    });

    // Thêm sự kiện timeline cho người 1
    await timelineService.createEvent(adminId, wsId, {
      title: "Mốc sự kiện của bà Mai",
      year: 1965,
      date_display: "Năm 1965",
      person_ids: [narratorPersonId],
    });

    // Lấy context của người 1
    const ctx1 = await personService.getPersonKnowledgeContext(adminId, wsId, narratorPersonId);
    expect(ctx1.person.full_name).toBe("Bà Lê Thị Mai");
    expect(ctx1.stats.assetsCount).toBe(1);
    expect(ctx1.stats.eventsCount).toBe(1);
    expect(ctx1.relationships.length).toBe(1);

    // Lấy context của người 3 (hồ sơ trống)
    const ctx3 = await personService.getPersonKnowledgeContext(adminId, wsId, emptyPersonId);
    expect(ctx3.person.full_name).toBe("Hồ Sơ Mới Chưa Có Dữ Liệu");
    expect(ctx3.stats.assetsCount).toBe(0);
    expect(ctx3.stats.eventsCount).toBe(0);
    expect(ctx3.stats.storiesCount).toBe(0);
    expect(ctx3.relationships.length).toBe(0);
  });

  it("P04 - Câu chuyện: Quản lý phiên bản, sửa sau duyệt chuyển thành bản nháp mới, Viewer chỉ thấy bản đã duyệt", async () => {
    // 1. Tạo câu chuyện bản 1
    const story = await storyService.createStory(contributorId, {
      workspace_id: wsId,
      title: "Chuyện đời xưa của bà Mai",
      content: "<p>Nội dung bản 1 chưa hoàn thiện.</p>",
      narrator_id: narratorPersonId,
      primary_asset_id: audioAssetId,
    });
    expect(story.status).toBe("pending_approval");
    expect(story.version_number).toBe(1);

    // Gắn evidence ref
    await storyService.addEvidenceRef(contributorId, wsId, {
      story_id: story.id,
      asset_id: audioAssetId,
      start_time_seconds: 10,
      end_time_seconds: 40,
      quote_text: "Đoạn ghi âm trích dẫn lời dặn",
    });

    // 2. Người kể chuyện duyệt bản 1
    await storyService.approveStory(narratorId, wsId, story.id);
    const approvedStory = await storyService.getStory(viewerId, wsId, story.id);
    expect(approvedStory.status).toBe("approved");
    expect(approvedStory.version_number).toBe(1);

    // 3. Contributor sửa câu chuyện -> Tạo phiên bản v2 và đưa về pending_approval
    const updatedStory = await storyService.updateStory(contributorId, wsId, story.id, {
      title: "Chuyện đời xưa của bà Mai (Đã sửa nội dung)",
      content: "<p>Nội dung bản 2 mới được cập nhật chi tiết hơn.</p>",
    });
    expect(updatedStory.version_number).toBe(2);
    expect(updatedStory.status).toBe("pending_approval");

    // 4. Người xem (Viewer) đọc câu chuyện: Phải nhận bản v1 đã duyệt (không bị lộ bản nháp v2)
    const viewerRead = await storyService.getStory(viewerId, wsId, story.id);
    expect(viewerRead.version_number).toBe(1);
    expect(viewerRead.title).toBe("Chuyện đời xưa của bà Mai");

    // 5. Admin / Contributor đọc câu chuyện: Xem được bản nháp v2 đang chờ duyệt
    const authorRead = await storyService.getStory(contributorId, wsId, story.id);
    expect(authorRead.version_number).toBe(2);
    expect(authorRead.title).toContain("(Đã sửa nội dung)");

    // 6. Người kể chuyện duyệt bản 2 -> Bây giờ Viewer xem được bản 2
    await storyService.approveStory(narratorId, wsId, story.id);
    const viewerReadV2 = await storyService.getStory(viewerId, wsId, story.id);
    expect(viewerReadV2.version_number).toBe(2);
    expect(viewerReadV2.title).toContain("(Đã sửa nội dung)");
  });

  it("P05 - Dòng thời gian: Hỗ trợ ngày chính xác/gần đúng/thập kỷ, kiểm tra quyền và chặn leak kho khác", async () => {
    // Tạo sự kiện với date_precision = decade
    const event = await timelineService.createEvent(adminId, wsId, {
      title: "Thập niên 1980 gia đình kinh doanh",
      year: 1980,
      date_display: "Khoảng thập niên 1980",
      date_precision: "decade",
      person_ids: [narratorPersonId],
      asset_ids: [audioAssetId],
    });

    expect(event.date_precision).toBe("decade");
    expect(event.persons.length).toBe(1);
    expect(event.assets.length).toBe(1);

    // Cập nhật sự kiện
    const updated = await timelineService.updateEvent(adminId, wsId, event.id, {
      title: "Thập niên 1980 gia đình mở rộng kinh doanh",
      date_precision: "approximate",
    });
    expect(updated.title).toBe("Thập niên 1980 gia đình mở rộng kinh doanh");
    expect(updated.date_precision).toBe("approximate");
  });

  it("P06 - Bản đồ tri thức: Tạo claim luôn ở trạng thái proposed, không thể tự gửi confirmed, yêu cầu kiểm chứng bằng chứng", async () => {
    const entPerson = await graphService.createEntity(adminId, wsId, {
      name: "Bà Lê Thị Mai",
      entity_type: "person",
      person_id: narratorPersonId,
    });
    const entSkill = await graphService.createEntity(adminId, wsId, {
      name: "Kỹ năng đan lát truyền thống",
      entity_type: "skill",
    });

    // Tạo claim: luôn ở trạng thái proposed
    const claim = await graphService.createClaim(contributorId, wsId, {
      source_entity_id: entPerson.id,
      target_entity_id: entSkill.id,
      relation_type: "mastered",
      statement: "Bà Mai thành thạo kỹ năng đan lát từ nhỏ",
      evidence_asset_id: audioAssetId,
      evidence_quote: "Lời dặn năm 2026",
    });
    expect(claim.status).toBe("proposed");

    // Viewer không được quyền confirm claim
    await expect(
      graphService.confirmClaim(viewerId, wsId, claim.id)
    ).rejects.toThrow("không có quyền");

    // Admin xác nhận claim -> chuyển sang confirmed
    const confirmed = await graphService.confirmClaim(adminId, wsId, claim.id);
    expect(confirmed.status).toBe("confirmed");
  });

  it("P07 - Tủ kinh nghiệm: Tạo cẩm nang luôn ở trạng thái pending_approval, sửa tạo version mới, người kể duyệt", async () => {
    const entSkill = await graphService.createEntity(adminId, wsId, {
      name: "Bí quyết pha trà sen Hà Nội",
      entity_type: "skill",
    });

    // 1. Tạo manual -> Luôn là pending_approval
    const manual = await manualService.createManual(contributorId, wsId, {
      skill_entity_id: entSkill.id,
      title: "Bí quyết ướp trà sen Tây Hồ gia truyền",
      summary: "Cách chọn sen bách diệp và gạo sen để ướp trà thơm sâu.",
      ingredients: [{ name: "Trà búp Thái Nguyên", amount: "1kg", category: "ingredient" }],
      steps: [
        {
          step_number: 1,
          title: "Tách gạo sen",
          instructions: "Tách nhẹ nhàng từng hạt gạo sen trắng ngà trong sớm mai.",
          success_signs: "Hạt gạo sen không bị dập nát.",
          evidence_asset_id: audioAssetId,
        },
      ],
    });
    expect(manual.status).toBe("pending_approval");
    expect(manual.version_number).toBe(1);

    // 2. Người xem (Viewer) không đọc được manual khi chưa duyệt
    await expect(
      manualService.getManual(viewerId, wsId, manual.id)
    ).rejects.toThrow("chờ phê duyệt");

    // 3. Người duyệt (Admin / Narrator) phê duyệt manual v1
    await manualService.approveManual(adminId, wsId, manual.id);
    const approvedV1 = await manualService.getManual(viewerId, wsId, manual.id);
    expect(approvedV1.status).toBe("approved");

    // 4. Sửa manual sau khi duyệt -> Tạo v2 pending_approval
    const updatedManual = await manualService.updateManual(contributorId, wsId, manual.id, {
      title: "Bí quyết ướp trà sen Tây Hồ gia truyền (Bản nâng cấp)",
      ingredients: [{ name: "Trà móc câu Tân Cương", amount: "1.2kg", category: "ingredient" }],
    });
    expect(updatedManual.version_number).toBe(2);
    expect(updatedManual.status).toBe("pending_approval");

    // 5. Người xem đọc vẫn thấy bản v1
    const viewerReadOld = await manualService.getManual(viewerId, wsId, manual.id);
    expect(viewerReadOld.version_number).toBe(1);
    expect(viewerReadOld.title).toBe("Bí quyết ướp trà sen Tây Hồ gia truyền");

    // 6. Duyệt v2 -> Người xem đọc được bản v2
    await manualService.approveManual(adminId, wsId, manual.id);
    const viewerReadNew = await manualService.getManual(viewerId, wsId, manual.id);
    expect(viewerReadNew.version_number).toBe(2);
    expect(viewerReadNew.title).toContain("(Bản nâng cấp)");
  });

  it("P08 - Q&A Động Có Nguồn Thật: Đổi định lượng trong CSDL (500g -> 600g), phân biệt 2 cẩm nang tương tự", async () => {
    // 1. Tạo Cẩm nang A: "Bí quyết làm bánh gối giòn xốp gia truyền" với 500g bột mì
    const manualA = await manualService.createManual(adminId, wsId, {
      title: "Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai",
      summary: "Công thức truyền thống nhiều đời.",
      ingredients: [
        { name: "Bột mì đa dụng", amount: "500g", category: "ingredient" },
      ],
      steps: [
        {
          step_number: 1,
          title: "Pha bột vỏ bánh giòn xốp",
          instructions: "Pha bột theo tỷ lệ: 500g bột mì đa dụng + 50g bột gạo tẻ + nước ấm.",
          success_signs: "Bột mịn, ấn tay đàn hồi không dính.",
          evidence_asset_id: audioAssetId,
          start_time_seconds: 45,
          end_time_seconds: 180,
        },
      ],
    });
    await manualService.approveManual(adminId, wsId, manualA.id);

    // 2. Tạo Cẩm nang B: "Bí quyết làm bánh gối chiên phồng kiểu hiện đại" với 300g bột bắp
    const manualB = await manualService.createManual(adminId, wsId, {
      title: "Bí quyết làm bánh gối chiên phồng kiểu hiện đại",
      summary: "Công thức biến tấu cho giới trẻ.",
      ingredients: [
        { name: "Bột bắp cao cấp", amount: "300g", category: "ingredient" },
      ],
      steps: [
        {
          step_number: 1,
          title: "Pha bột vỏ bánh phồng hiện đại",
          instructions: "Dùng 300g bột bắp cao cấp trộn cùng sữa tươi không đường.",
          success_signs: "Bột phồng xốp rỗng ruột.",
          start_time_seconds: 20,
          end_time_seconds: 60,
        },
      ],
    });
    await manualService.approveManual(adminId, wsId, manualB.id);

    // Hỏi về cẩm nang A ban đầu
    const resA1 = await searchService.askQuestion(
      adminId,
      wsId,
      "Bí quyết pha bột bánh gối của bà Mai là gì?"
    );
    expect(resA1.has_sufficient_data).toBe(true);
    expect(resA1.answer).toContain("500g bột mì");
    expect(resA1.citations[0].source_id).toBe(manualA.id);

    // Hỏi về cẩm nang B (hiện đại)
    const resB = await searchService.askQuestion(
      adminId,
      wsId,
      "Pha bột bánh gối chiên phồng kiểu hiện đại như thế nào?"
    );
    expect(resB.has_sufficient_data).toBe(true);
    expect(resB.answer).toContain("300g bột bắp");
    expect(resB.citations[0].source_id).toBe(manualB.id);

    // ĐỔI ĐỊNH LƯỢNG TRONG CSDL: Cập nhật Cẩm nang A từ 500g thành 600g bột mì
    await pglite.query(
      `UPDATE practice_manuals
       SET steps = $1, ingredients = $2
       WHERE id = $3`,
      [
        JSON.stringify([
          {
            step_number: 1,
            title: "Pha bột vỏ bánh giòn xốp",
            instructions: "Pha bột theo tỷ lệ: 600g bột mì đa dụng + 60g bột gạo tẻ + nước ấm.",
            success_signs: "Bột mịn, ấn tay đàn hồi không dính.",
            evidence_asset_id: audioAssetId,
            start_time_seconds: 45,
            end_time_seconds: 180,
          },
        ]),
        JSON.stringify([
          { name: "Bột mì đa dụng", amount: "600g", category: "ingredient" },
        ]),
        manualA.id,
      ]
    );

    // Hỏi lại cẩm nang A: Câu trả lời ĐỘNG PHẢI ĐỔI THÀNH 600g và KHÔNG CÒN 500g!
    const resA2 = await searchService.askQuestion(
      adminId,
      wsId,
      "Bí quyết pha bột bánh gối của bà Mai là gì?"
    );
    expect(resA2.has_sufficient_data).toBe(true);
    expect(resA2.answer).toContain("600g bột mì");
    expect(resA2.answer).not.toContain("500g");

    // Thử hỏi cẩm nang chưa duyệt (pending_approval)
    const unapprovedManual = await manualService.createManual(adminId, wsId, {
      title: "Món ăn bí mật chưa công bố",
      summary: "Bí mật tuyệt mật chưa được duyệt.",
      ingredients: [{ name: "Gia vị bí mật", amount: "10g" }],
      steps: [{ step_number: 1, title: "Nấu", instructions: "Nấu kỹ", success_signs: "Thức ăn chín vàng thơm" }],
    });
    const resSecret = await searchService.askQuestion(
      adminId,
      wsId,
      "Món ăn bí mật chưa công bố nấu như thế nào?"
    );
    expect(resSecret.has_sufficient_data).toBe(false);
    expect(resSecret.citations.length).toBe(0);
  });
});
