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

describe("P08 - Tìm kiếm & Hỏi đáp (SearchService & Strict Q&A)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let personService: PersonService;
  let assetService: AssetService;
  let storyService: StoryService;
  let timelineService: TimelineService;
  let manualService: ManualService;
  let graphService: GraphService;
  let searchService: SearchService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const narratorUserId = "44444444-4444-4444-4444-444444444444";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  let wsId: string;
  let audioAssetId: string;
  let baMaiPersonId: string;
  let bacAnPersonId: string;
  let manualId: string;
  let storyId: string;

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

    // 1. Tạo Person
    const p1 = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
      nick_name: "Bà Nội",
      gender: "female",
      birth_date: "1936",
      bio: "Gốc làng bánh gối Hà Nội xưa. Nắm giữ bí quyết pha bột giòn xốp và làm nhân truyền thống.",
    });
    baMaiPersonId = p1.id;

    const p2 = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bác Nguyễn Văn An",
      nick_name: "Bác Cả",
      gender: "male",
      birth_date: "1960",
      bio: "Con trai cả của bà Mai. Người ghi âm và lưu giữ ký ức gia đình.",
      linked_user_id: adminUserId,
    });
    bacAnPersonId = p2.id;

    // 2. Tạo Asset (Audio)
    const audio = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ghi_am_bi_quyet_banh_goi_ba_mai_1998.mp3",
      title: "Băng ghi âm lời kể bí quyết bánh gối bà Mai",
      description: "Băng cassette thu âm năm 1998 tại căn nhà 48 Hàng Bông.",
      file_path: "/uploads/audio.mp3",
      byte_size: 4500000,
      mime_type: "audio/mpeg",
      duration_seconds: 720,
    });
    audioAssetId = audio.id;

    // 3. Tạo Story & duyệt
    const s = await storyService.createStory(adminUserId, {
      workspace_id: wsId,
      title: "Chuyện gánh hàng rong phố cổ của mẹ",
      content: "<p>Những năm tháng bà Mai tần tảo bên gánh bánh gối nuôi các con ăn học.</p>",
      summary: "Ký ức về gánh quà bánh phố cổ của bà Mai nuôi các con khôn lớn.",
      narrator_id: baMaiPersonId,
      category: "memorial",
    });
    storyId = s.id;
    await storyService.approveStory(narratorUserId, wsId, storyId);

    // 4. Tạo Timeline Event
    await timelineService.createEvent(adminUserId, wsId, {
      title: "Gia đình chuyển về phố Hàng Bông (1954)",
      description: "Sau ngày giải phóng thủ đô 10/10/1954, gia đình bắt đầu mở gánh bánh gối nhỏ mưu sinh.",
      event_date: "1954-10-10",
      year: 1954,
      date_display: "10/10/1954",
      date_precision: "exact",
      location: "48 Hàng Bông, Hoàn Kiếm, Hà Nội",
      importance: "milestone",
    });

    // 5. Tạo Graph Entity & Claim
    const entSkill = await graphService.createEntity(adminUserId, wsId, {
      name: "Bí quyết làm bánh gối Hà Nội",
      entity_type: "skill",
      description: "Kỹ năng chế biến vỏ bánh giòn rụm và nước chấm chua ngọt gia truyền",
    });
    const entPerson = await graphService.createEntity(adminUserId, wsId, {
      name: "Bà Lê Thị Mai",
      entity_type: "person",
      person_id: baMaiPersonId,
    });
    const claim = await graphService.createClaim(adminUserId, wsId, {
      source_entity_id: entPerson.id,
      target_entity_id: entSkill.id,
      relation_type: "created",
      statement: "Bà Mai sáng tạo công thức bánh gối gia truyền từ năm 1954",
    });
    await graphService.confirmClaim(adminUserId, wsId, claim.id);

    // 6. Tạo Manual & duyệt
    const m = await manualService.createManual(adminUserId, wsId, {
      title: "Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai",
      summary: "Công thức pha vỏ bột giòn rụm không bị ỉu dầu và dấu hiệu nhiệt độ chảo rán chuẩn.",
      ingredients: [
        { name: "Bột mì đa dụng", amount: "500", category: "ingredient" },
        { name: "Bột gạo tẻ", amount: "50", category: "ingredient" },
      ],
      steps: [
        {
          step_number: 1,
          title: "Pha bột vỏ bánh giòn xốp",
          instructions: "Pha bột vỏ bánh theo tỷ lệ: 500g bột mì + 50g bột gạo tẻ + 1 lòng đỏ trứng + 50g bơ lạt + 220ml nước ấm.",
          success_signs: "Bột mịn màng, ấn tay đàn hồi không dính.",
          evidence_asset_id: audioAssetId,
          start_time_seconds: 45,
          end_time_seconds: 180,
        },
        {
          step_number: 2,
          title: "Căn nhiệt độ chảo rán",
          instructions: "Đun sôi dầu trên lửa vừa, kiểm tra nhiệt độ bằng đũa tre hoặc đũa gỗ.",
          success_signs: "Cắm đầu đũa gỗ thấy sủi tăm li ti liên tục quanh đầu đũa (160-170 độ C)",
          evidence_asset_id: audioAssetId,
          start_time_seconds: 410,
          end_time_seconds: 520,
        },
      ],
    });
    manualId = m.id;
    await manualService.approveManual(adminUserId, wsId, manualId);
  });

  it("1. Tìm kiếm từ khóa đa miền (multi-domain search) chính xác", async () => {
    // Tìm "bánh gối"
    const results = await searchService.search(adminUserId, wsId, {
      query: "bánh gối",
    });

    expect(results.length).toBeGreaterThan(0);

    const types = results.map((r) => r.type);
    expect(types).toContain("manual");
    expect(types).toContain("asset");

    // Lọc theo type = "manual"
    const manualOnly = await searchService.search(adminUserId, wsId, {
      query: "bánh gối",
      type: "manual",
    });
    expect(manualOnly.length).toBe(1);
    expect(manualOnly[0].type).toBe("manual");
  });

  it("2. Strict Q&A: Trả lời có trích dẫn nguồn gốc và timestamp khi có dữ liệu", async () => {
    const q1 = "Bí quyết pha bột bánh gối của bà Mai là gì?";
    const res1 = await searchService.askQuestion(adminUserId, wsId, q1);

    expect(res1.has_sufficient_data).toBe(true);
    expect(res1.citations.length).toBeGreaterThan(0);
    expect(res1.citations[0].source_type).toBe("manual");
    expect(res1.citations[0].start_time_seconds).toBe(45);
    expect(res1.answer).toContain("500g bột mì");

    const q2 = "Làm sao để biết dầu đã đủ nóng khi rán bánh gối?";
    const res2 = await searchService.askQuestion(adminUserId, wsId, q2);

    expect(res2.has_sufficient_data).toBe(true);
    expect(res2.citations.length).toBeGreaterThan(0);
    expect(res2.answer).toContain("đũa gỗ");
  });

  it("3. Strict Q&A Zero-Hallucination: Từ chối bịa đặt khi thiếu căn cứ trong kho", async () => {
    const qMissing = "Ông nội thích đi du lịch ở thành phố nào nhất?";
    const res = await searchService.askQuestion(adminUserId, wsId, qMissing);

    expect(res.has_sufficient_data).toBe(false);
    expect(res.citations.length).toBe(0);
    expect(res.answer).toContain("chưa có đủ dữ liệu đã xác thực");
    expect(res.suggested_questions.length).toBeGreaterThan(0);
  });

  it("4. Cách ly truy cập (RLS / Multi-tenant isolation)", async () => {
    // Người ngoài không được phép tìm kiếm hoặc hỏi đáp
    await expect(
      searchService.search(outsiderUserId, wsId, { query: "bánh gối" })
    ).rejects.toThrow("Không có quyền truy cập kho ký ức này");

    await expect(
      searchService.askQuestion(outsiderUserId, wsId, "Bà Mai sinh năm bao nhiêu?")
    ).rejects.toThrow("Không có quyền truy cập kho ký ức này");

    // Thành viên Viewer vẫn được phép tìm kiếm và hỏi đáp
    const viewerSearch = await searchService.search(viewerUserId, wsId, { query: "bánh gối" });
    expect(viewerSearch.length).toBeGreaterThan(0);

    const viewerQA = await searchService.askQuestion(viewerUserId, wsId, "Bà Mai sinh năm bao nhiêu?");
    expect(viewerQA.has_sufficient_data).toBe(true);
  });

  it("5. Benchmark 20 câu hỏi: Đạt chuẩn xác thực >= 10/12 và zero-hallucination 8/8", async () => {
    const benchmark = await searchService.runBenchmark20Questions(adminUserId, wsId);

    expect(benchmark.total_questions).toBe(20);
    expect(benchmark.answered_correctly).toBeGreaterThanOrEqual(10);
    expect(benchmark.no_hallucination_verified).toBe(8);
    expect(benchmark.passed).toBe(true);
  });
});
