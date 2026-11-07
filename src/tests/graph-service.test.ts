import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { AssetService } from "@/lib/server/asset.service";
import { GraphService } from "@/lib/server/graph.service";

describe("P06 - Bản đồ tri thức (GraphService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let assetService: AssetService;
  let graphService: GraphService;

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
    graphService = new GraphService(pglite);

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

    // Tạo tư liệu âm thanh mẫu
    const audio = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ba_mai_ke_chuyen_banh_goi.mp3",
      file_path: "/uploads/ba_mai.mp3",
      mime_type: "audio/mpeg",
      byte_size: 4000000,
      duration_seconds: 300,
      title: "Bà kể về xuất xứ món bánh gối và cách ủ bột",
    });
    audioAssetId = audio.id;
  });

  it("1. Tạo các nút thực thể (person, place, event, skill)", async () => {
    const personNode = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "person",
      name: "Bà Lê Thị Mai",
      aliases: ["Bà Nội"],
      description: "Người nắm giữ công thức bánh gối gia truyền",
    });

    const placeNode = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "place",
      name: "Ngõ Hàng Chiếu - Phố Cổ",
      description: "Góc phố bà gánh bánh rong bán từ năm 1965",
    });

    const skillNode = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "skill",
      name: "Kỹ năng ủ bột xốp giòn",
      description: "Bí quyết pha nước ấm và để bột nghỉ 1 canh giờ",
    });

    expect(personNode.id).toBeDefined();
    expect(personNode.entity_type).toBe("person");
    expect(placeNode.entity_type).toBe("place");
    expect(skillNode.entity_type).toBe("skill");

    const list = await graphService.listEntities(adminUserId, wsId);
    expect(list.length).toBe(3);
  });

  it("2. Tạo liên kết có nguồn (Claim) kèm mốc thời gian âm thanh", async () => {
    const personNode = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "person",
      name: "Bà Lê Thị Mai",
    });
    const skillNode = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "skill",
      name: "Kỹ năng ủ bột xốp giòn",
    });

    const claim = await graphService.createClaim(adminUserId, wsId, {
      source_entity_id: personNode.id,
      target_entity_id: skillNode.id,
      relation_type: "mastered",
      statement: "Bà Mai nắm giữ bí quyết ủ bột xốp giòn",
      status: "proposed",
      evidence_asset_id: audioAssetId,
      evidence_quote: "Bột mì phải hòa nước ấm vừa tay, nhào đều rồi ủ lại cho bột thở.",
      start_time_seconds: 30,
      end_time_seconds: 75,
    });

    expect(claim.id).toBeDefined();
    expect(claim.relation_type).toBe("mastered");
    expect(claim.status).toBe("proposed");
    expect(claim.start_time_seconds).toBe(30);
    expect(claim.end_time_seconds).toBe(75);
    expect(claim.evidence_asset_id).toBe(audioAssetId);
  });

  it("3. Phê duyệt đề xuất liên kết: Chỉ Narrator hoặc Admin mới duyệt được", async () => {
    const nodeA = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "person",
      name: "Bà Lê Thị Mai",
    });
    const nodeB = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "person",
      name: "Bác Nguyễn Văn An",
    });

    const claim = await graphService.createClaim(contributorUserId, wsId, {
      source_entity_id: nodeA.id,
      target_entity_id: nodeB.id,
      relation_type: "taught",
      statement: "Bà Mai truyền dạy nghề bánh cho Bác An",
      status: "proposed",
    });

    // 1. Viewer cố tình duyệt -> Bị từ chối
    await expect(
      graphService.confirmClaim(viewerUserId, wsId, claim.id)
    ).rejects.toThrow("Từ chối quyền");

    // 2. Contributor cố tình duyệt -> Bị từ chối
    await expect(
      graphService.confirmClaim(contributorUserId, wsId, claim.id)
    ).rejects.toThrow("Từ chối quyền");

    // 3. Người kể (Narrator) duyệt -> Thành công
    const confirmed = await graphService.confirmClaim(narratorUserId, wsId, claim.id);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmed_by).toBe(narratorUserId);
  });

  it("4. Khám phá lân cận (Neighborhood Exploration): Trả về tâm và các nút kết nối", async () => {
    const center = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "person",
      name: "Bà Lê Thị Mai",
    });
    const place = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "place",
      name: "Ngõ Hàng Chiếu",
    });
    const skill = await graphService.createEntity(adminUserId, wsId, {
      entity_type: "skill",
      name: "Ủ bột giòn",
    });

    // Tạo 2 cạnh kết nối và duyệt xác nhận
    const c1 = await graphService.createClaim(adminUserId, wsId, {
      source_entity_id: center.id,
      target_entity_id: place.id,
      relation_type: "sold_at",
      statement: "Bà Mai từng bán bánh ở Ngõ Hàng Chiếu",
    });
    await graphService.confirmClaim(adminUserId, wsId, c1.id);

    const c2 = await graphService.createClaim(adminUserId, wsId, {
      source_entity_id: center.id,
      target_entity_id: skill.id,
      relation_type: "mastered",
      statement: "Bà Mai nắm giữ kỹ năng ủ bột",
    });
    await graphService.confirmClaim(adminUserId, wsId, c2.id);

    const neighborhood = await graphService.getNeighborhood(adminUserId, wsId, center.id);
    expect(neighborhood.center_node.id).toBe(center.id);
    expect(neighborhood.nodes.length).toBe(3); // Center + 2 connected
    expect(neighborhood.edges.length).toBe(2);
    expect(neighborhood.edges[0].source_name).toBe("Bà Lê Thị Mai");
  });

  it("5. Cách ly kho gia đình: Người ngoài không thể truy cập bản đồ tri thức", async () => {
    await graphService.createEntity(adminUserId, wsId, {
      entity_type: "skill",
      name: "Bí quyết bí mật gia đình",
    });

    await expect(
      graphService.listEntities(outsiderUserId, wsId)
    ).rejects.toThrow("Truy cập bị từ chối");
  });
});
