import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { AssetService } from "@/lib/server/asset.service";
import { TimelineService } from "@/lib/server/timeline.service";

describe("P05 - Dòng thời gian (TimelineService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let personService: PersonService;
  let assetService: AssetService;
  let timelineService: TimelineService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  let wsId: string;
  let personBaMaiId: string;
  let personBacAnId: string;
  let photoAssetId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    personService = new PersonService(pglite);
    assetService = new AssetService(pglite);
    timelineService = new TimelineService(pglite);

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

    // Tạo kho gia đình
    const ws = await wsService.createWorkspace(adminUserId, {
      name: "Kho Ký Ức Gia Đình Họ Nguyễn",
    });
    wsId = ws.id;

    await wsService.addMemberDirectly(adminUserId, wsId, contributorUserId, "contributor");
    await wsService.addMemberDirectly(adminUserId, wsId, viewerUserId, "viewer");

    // Tạo hồ sơ người thân mẫu
    const baMai = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bà Lê Thị Mai",
      nick_name: "Bà Nội",
      birth_date: "1936",
      bio: "Gốc làng nghề bánh gối cổ truyền Hà Nội",
    });
    personBaMaiId = baMai.id;

    const bacAn = await personService.createPerson(adminUserId, {
      workspace_id: wsId,
      full_name: "Bác Nguyễn Văn An",
      birth_date: "1960",
    });
    personBacAnId = bacAn.id;

    // Tạo tư liệu mẫu
    const photo = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "image",
      file_name: "anh_ba_mai_1965.jpg",
      file_path: "/uploads/anh_ba_mai_1965.jpg",
      mime_type: "image/jpeg",
      byte_size: 1024000,
      title: "Ảnh bà Mai gánh hàng bánh gối",
    });
    photoAssetId = photo.id;
  });

  it("1. Tạo sự kiện dòng thời gian với ngày gần đúng & gắn người, tư liệu", async () => {
    const event = await timelineService.createEvent(adminUserId, wsId, {
      title: "Bà Mai bắt đầu gánh hàng bánh gối ở phố cổ Hà Nội",
      description: "Gánh hàng bánh gối đầu tiên ở ngõ Hàng Chiếu - chợ Đồng Xuân",
      year: 1965,
      date_display: "Mùa thu năm 1965",
      date_precision: "approximate",
      location: "Ngõ Hàng Chiếu, Hà Nội",
      importance: "milestone",
      person_ids: [personBaMaiId],
      asset_ids: [photoAssetId],
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe("Bà Mai bắt đầu gánh hàng bánh gối ở phố cổ Hà Nội");
    expect(event.year).toBe(1965);
    expect(event.date_display).toBe("Mùa thu năm 1965");
    expect(event.importance).toBe("milestone");
    expect(event.persons.length).toBe(1);
    expect(event.persons[0].person_id).toBe(personBaMaiId);
    expect(event.persons[0].full_name).toBe("Bà Lê Thị Mai");
    expect(event.assets.length).toBe(1);
    expect(event.assets[0].asset_id).toBe(photoAssetId);
    expect(event.assets[0].file_name).toBe("anh_ba_mai_1965.jpg");
  });

  it("2. Lọc và sắp xếp sự kiện dòng thời gian theo thứ tự năm", async () => {
    // Sự kiện 1: 1936
    await timelineService.createEvent(adminUserId, wsId, {
      title: "Bà Mai sinh ra tại ngoại thành Hà Nội",
      year: 1936,
      date_display: "Năm 1936",
      date_precision: "year",
      person_ids: [personBaMaiId],
    });

    // Sự kiện 2: 1995
    await timelineService.createEvent(adminUserId, wsId, {
      title: "Bà truyền dạy bí quyết cho Bác An",
      year: 1995,
      date_display: "Tháng 8/1995",
      date_precision: "month",
      person_ids: [personBaMaiId, personBacAnId],
    });

    // Sự kiện 3: 1965
    await timelineService.createEvent(adminUserId, wsId, {
      title: "Gánh bánh gối phố cổ",
      year: 1965,
      date_display: "Khoảng 1965",
      date_precision: "decade",
      importance: "milestone",
      person_ids: [personBaMaiId],
    });

    const allEvents = await timelineService.listEvents(adminUserId, wsId);
    expect(allEvents.length).toBe(3);
    // Phải sắp xếp đúng theo năm tăng dần
    expect(allEvents[0].year).toBe(1936);
    expect(allEvents[1].year).toBe(1965);
    expect(allEvents[2].year).toBe(1995);

    // Lọc theo người (Bác An)
    const bacAnEvents = await timelineService.listEvents(adminUserId, wsId, {
      person_id: personBacAnId,
    });
    expect(bacAnEvents.length).toBe(1);
    expect(bacAnEvents[0].year).toBe(1995);

    // Lọc theo khoảng năm (từ 1960 đến 1990)
    const filteredYear = await timelineService.listEvents(adminUserId, wsId, {
      year_from: 1960,
      year_to: 1990,
    });
    expect(filteredYear.length).toBe(1);
    expect(filteredYear[0].year).toBe(1965);
  });

  it("3. Cập nhật sự kiện dòng thời gian", async () => {
    const event = await timelineService.createEvent(adminUserId, wsId, {
      title: "Sổ tay công thức gia truyền",
      year: 1980,
      date_display: "Năm 1980",
      importance: "normal",
    });

    const updated = await timelineService.updateEvent(adminUserId, wsId, event.id, {
      title: "Hoàn thiện sổ tay công thức gia truyền bìa xanh",
      importance: "milestone",
      location: "Số 12 Phố Cổ",
      person_ids: [personBaMaiId],
    });

    expect(updated.title).toBe("Hoàn thiện sổ tay công thức gia truyền bìa xanh");
    expect(updated.importance).toBe("milestone");
    expect(updated.location).toBe("Số 12 Phố Cổ");
    expect(updated.persons.length).toBe(1);
  });

  it("4. Phân quyền: Viewer không được tạo sự kiện; Contributor không xóa được sự kiện của người khác", async () => {
    // 1. Viewer cố tạo sự kiện
    await expect(
      timelineService.createEvent(viewerUserId, wsId, {
        title: "Sự kiện của Viewer",
        year: 2026,
        date_display: "2026",
      })
    ).rejects.toThrow("Từ chối quyền");

    // 2. Admin tạo sự kiện
    const adminEvent = await timelineService.createEvent(adminUserId, wsId, {
      title: "Kỷ niệm đại gia đình",
      year: 2026,
      date_display: "Tết 2026",
    });

    // 3. Contributor cố xóa sự kiện của Admin
    await expect(
      timelineService.deleteEvent(contributorUserId, wsId, adminEvent.id)
    ).rejects.toThrow("Từ chối quyền");

    // 4. Admin xóa sự kiện thành công
    await timelineService.deleteEvent(adminUserId, wsId, adminEvent.id);
    const checkDeleted = await timelineService.getEventById(adminUserId, wsId, adminEvent.id);
    expect(checkDeleted).toBeNull();
  });

  it("5. Cách ly kho: Người ngoài không được phép truy cập dòng thời gian", async () => {
    await timelineService.createEvent(adminUserId, wsId, {
      title: "Kỷ niệm riêng tư của gia đình",
      year: 2020,
      date_display: "2020",
    });

    await expect(
      timelineService.listEvents(outsiderUserId, wsId)
    ).rejects.toThrow("Truy cập bị từ chối");
  });
});
