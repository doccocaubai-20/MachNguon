import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";

describe("P02 - Hồ sơ người thân & Phả hệ gia đình (PersonService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let personService: PersonService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  let wsId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    personService = new PersonService(pglite);

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
       ($4, 'outsider@ngoaigia.vn', 'Người Ngoài Gia Đình')`,
      [adminUserId, contributorUserId, viewerUserId, outsiderUserId]
    );

    // Tạo kho gia đình họ Nguyễn
    const ws = await wsService.createWorkspace(adminUserId, {
      name: "Kho Ký Ức Gia Đình Họ Nguyễn",
    });
    wsId = ws.id;

    // Thêm contributor và viewer
    await wsService.addMemberDirectly(adminUserId, wsId, contributorUserId, "contributor");
    await wsService.addMemberDirectly(adminUserId, wsId, viewerUserId, "viewer");
  });

  it("1. Tạo hồ sơ người thân thành công", async () => {
    const grandmother = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
      nick_name: "Bà Nội",
      gender: "female",
      birth_date: "Khoảng 1930",
      bio: "Nắm giữ công thức làm bánh truyền thống gia đình.",
    });

    expect(grandmother.id).toBeDefined();
    expect(grandmother.full_name).toBe("Bà Lê Thị Mai");
    expect(grandmother.birth_date).toBe("Khoảng 1930");

    const persons = await personService.listPersons(adminUserId, wsId);
    expect(persons.length).toBe(1);
    expect(persons[0].id).toBe(grandmother.id);
  });

  it("2. Không tự động gộp hai người trùng tên (Identity Separation)", async () => {
    // Tạo người 1: Ông Nguyễn Văn An (thế hệ ông)
    const person1 = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Nguyễn Văn An",
      nick_name: "Ông Cố",
      birth_date: "1910",
    });

    // Tạo người 2: Cháu Nguyễn Văn An (cháu đích tôn trùng tên ông)
    const person2 = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Nguyễn Văn An",
      nick_name: "Cu Tí",
      birth_date: "2015",
    });

    expect(person1.id).not.toBe(person2.id);
    const list = await personService.listPersons(adminUserId, wsId);
    expect(list.length).toBe(2);
  });

  it("3. Thiết lập quan hệ gia đình hai chiều (Bi-directional Relationships)", async () => {
    // Tạo Bà Nội
    const grandMother = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
      gender: "female",
    });

    // Tạo Cháu Gái (Mai Châu)
    const grandChild = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Nguyễn Mai Châu",
      gender: "female",
    });

    // Thêm quan hệ: Bà Mai là 'grandparent' của Mai Châu
    await personService.addRelationship(adminUserId, {
      workspace_id: wsId,
      person_id: grandMother.id,
      related_person_id: grandChild.id,
      relationship_type: "grandparent",
      notes: "Bà nội và cháu gái",
    });

    // Kiểm tra góc nhìn của Bà Mai: Có cháu gái Mai Châu
    const gmDetail = await personService.getPerson(adminUserId, wsId, grandMother.id);
    expect(gmDetail.relationships.length).toBe(1);
    expect(gmDetail.relationships[0].relatedPersonId).toBe(grandChild.id);
    expect(gmDetail.relationships[0].relationshipType).toBe("grandparent");

    // Kiểm tra góc nhìn của Mai Châu: Tự động có quan hệ ngược lại 'grandchild'
    const gcDetail = await personService.getPerson(adminUserId, wsId, grandChild.id);
    expect(gcDetail.relationships.length).toBe(1);
    expect(gcDetail.relationships[0].relatedPersonId).toBe(grandMother.id);
    expect(gcDetail.relationships[0].relationshipType).toBe("grandchild");
  });

  it("4. Cách ly kho: Người ngoài không xem được hồ sơ người thân của gia đình khác", async () => {
    await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
    });

    await expect(
      personService.listPersons(outsiderUserId, wsId)
    ).rejects.toThrow("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
  });

  it("5. Người xem (Viewer) có quyền đọc nhưng không có quyền tạo hồ sơ", async () => {
    const p = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bác Nguyễn Văn An",
    });

    // Viewer đọc danh sách -> Được phép
    const list = await personService.listPersons(viewerUserId, wsId);
    expect(list.length).toBe(1);

    // Viewer cố tạo hồ sơ người thân -> Bị từ chối quyền
    await expect(
      personService.createPerson(viewerUserId, {
        workspace_id: wsId,
        full_name: "Người thân mới",
      })
    ).rejects.toThrow("Từ chối quyền: Vai trò 'viewer' không có quyền 'story:propose'.");
  });
});
