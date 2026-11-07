import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { AssetService } from "@/lib/server/asset.service";
import { SearchService } from "@/lib/server/search.service";

describe("P03 - Kho tư liệu âm thanh, ảnh, tài liệu (AssetService)", () => {
  let pglite: PGlite;
  let wsService: WorkspaceService;
  let assetService: AssetService;

  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const contributorUserId = "22222222-2222-2222-2222-222222222222";
  const viewerUserId = "33333333-3333-3333-3333-333333333333";
  const outsiderUserId = "99999999-9999-9999-9999-999999999999";

  let wsId: string;

  beforeEach(async () => {
    pglite = new PGlite();
    wsService = new WorkspaceService(pglite);
    assetService = new AssetService(pglite);

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

    // Tạo kho
    const ws = await wsService.createWorkspace(adminUserId, {
      name: "Kho Tư Liệu Ký Ức Gia Đình",
    });
    wsId = ws.id;

    await wsService.addMemberDirectly(adminUserId, wsId, contributorUserId, "contributor");
    await wsService.addMemberDirectly(adminUserId, wsId, viewerUserId, "viewer");
  });

  it("1. Tải lên tư liệu âm thanh và hình ảnh thành công", async () => {
    const audio = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ba_ke_chuyen_tet_xua.mp3",
      file_path: "/uploads/audio_01.mp3",
      mime_type: "audio/mpeg",
      byte_size: 4500000,
      duration_seconds: 320,
      title: "Lời kể: Ký ức ngày Tết thời bao cấp của bà",
    });

    expect(audio.id).toBeDefined();
    expect(audio.asset_type).toBe("audio");
    expect(Number(audio.duration_seconds)).toBe(320);

    const image = await assetService.createAsset(contributorUserId, {
      workspace_id: wsId,
      asset_type: "image",
      file_name: "anh_gia_dinh_1975.jpg",
      file_path: "/uploads/img_01.jpg",
      mime_type: "image/jpeg",
      byte_size: 1800000,
      title: "Ảnh chụp cả nhà trước hiên nhà cũ năm 1975",
    });

    expect(image.id).toBeDefined();
    expect(image.asset_type).toBe("image");

    const all = await assetService.listAssets(adminUserId, wsId);
    expect(all.length).toBe(2);
  });

  it("2. Lọc tư liệu theo loại (Audio, Image, Document)", async () => {
    await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "audio.mp3",
      file_path: "/uploads/a.mp3",
      mime_type: "audio/mpeg",
      byte_size: 1000,
      title: "Audio 1",
    });

    await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "image",
      file_name: "photo.jpg",
      file_path: "/uploads/p.jpg",
      mime_type: "image/jpeg",
      byte_size: 2000,
      title: "Photo 1",
    });

    const audios = await assetService.listAssets(adminUserId, wsId, { assetType: "audio" });
    expect(audios.length).toBe(1);
    expect(audios[0].asset_type).toBe("audio");

    const images = await assetService.listAssets(adminUserId, wsId, { assetType: "image" });
    expect(images.length).toBe(1);
    expect(images[0].asset_type).toBe("image");
  });

  it("3. Cách ly kho: Người ngoài không xem được tư liệu của kho gia đình khác", async () => {
    await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "secret.mp3",
      file_path: "/uploads/s.mp3",
      mime_type: "audio/mpeg",
      byte_size: 1000,
      title: "Chuyện riêng gia đình",
    });

    await expect(
      assetService.listAssets(outsiderUserId, wsId)
    ).rejects.toThrow("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
  });

  it("Chỉ người tải thấy tư liệu riêng qua truy vấn trực tiếp và tìm kiếm", async () => {
    const asset = await assetService.createAsset(contributorUserId, {
      workspace_id: wsId,
      asset_type: "audio",
      file_name: "ghi-am-rieng.mp3",
      file_path: "/uploads/ghi-am-rieng.mp3",
      mime_type: "audio/mpeg",
      byte_size: 1000,
      title: "Tư liệu tuyệt mật thử nghiệm",
      shared_with_family: false,
    });
    const search = new SearchService(pglite);
    const query = { query: "tuyệt mật", type: "asset" as const };
    expect((await search.search(contributorUserId, wsId, query)).map((item) => item.id)).toContain(asset.id);
    for (const userId of [viewerUserId, adminUserId]) {
      await expect(assetService.getAsset(userId, wsId, asset.id)).rejects.toThrow();
      await expect(assetService.listAssets(userId, wsId)).resolves.toEqual([]);
      await expect(search.search(userId, wsId, query)).resolves.toEqual([]);
      await expect(assetService.deleteAsset(userId, wsId, asset.id)).rejects.toThrow();
    }
  });

  it("4. Quyền xóa: Contributor xóa được file mình tải, không xóa được file người khác; Admin xóa được mọi file đã chia sẻ", async () => {
    // Admin tải file 1
    const adminFile = await assetService.createAsset(adminUserId, {
      workspace_id: wsId,
      asset_type: "document",
      file_name: "giapha.pdf",
      file_path: "/uploads/gp.pdf",
      mime_type: "application/pdf",
      byte_size: 5000,
      title: "Gia phả dòng họ",
    });

    // Contributor tải file 2
    const contributorFile = await assetService.createAsset(contributorUserId, {
      workspace_id: wsId,
      asset_type: "image",
      file_name: "anh.jpg",
      file_path: "/uploads/anh.jpg",
      mime_type: "image/jpeg",
      byte_size: 3000,
      title: "Ảnh ngày mùa",
    });

    // Contributor cố xóa file của Admin -> Bị từ chối
    await expect(
      assetService.deleteAsset(contributorUserId, wsId, adminFile.id)
    ).rejects.toThrow("Từ chối quyền: Bạn chỉ có thể xóa tư liệu do chính bạn tải lên.");

    // Contributor tự xóa file của mình -> Thành công
    const res = await assetService.deleteAsset(contributorUserId, wsId, contributorFile.id);
    expect(res.deletedFilePath).toBe("/uploads/anh.jpg");

    // Admin xóa file của mình -> Thành công
    await assetService.deleteAsset(adminUserId, wsId, adminFile.id);
    const remaining = await assetService.listAssets(adminUserId, wsId);
    expect(remaining.length).toBe(0);
  });

  it("5. Người xem (Viewer) không có quyền upload tư liệu", async () => {
    await expect(
      assetService.createAsset(viewerUserId, {
        workspace_id: wsId,
        asset_type: "audio",
        file_name: "test.mp3",
        file_path: "/uploads/test.mp3",
        mime_type: "audio/mpeg",
        byte_size: 1000,
        title: "Viewer upload",
      })
    ).rejects.toThrow("Từ chối quyền: Vai trò 'viewer' không có quyền 'asset:upload'.");
  });
});
