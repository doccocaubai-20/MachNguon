import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getCurrentUserIdOptional } from "@/lib/auth/session";
import { dataRoot } from "@/lib/auth/mode";
import { getDb } from "@/lib/server/db";
import { AssetService } from "@/lib/server/asset.service";
import { AssetType, CreateAssetSchema } from "@/contracts/asset.contract";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { assertPermission } from "@/lib/server/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = [
  ".mp3", ".wav", ".webm", ".m4a", ".ogg",
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".pdf", ".txt", ".doc", ".docx"
];

export async function POST(req: NextRequest, { params }: Props) {
  let targetFilePath: string | null = null;
  try {
    const { id: workspaceId } = await params;
    const userId = await getCurrentUserIdOptional();
    if (!userId) return NextResponse.json({ error: "Yêu cầu đăng nhập." }, { status: 401 });
    const db = await getDb();
    try {
      const { currentMember } = await new WorkspaceService(db).getWorkspace(userId, workspaceId);
      assertPermission(currentMember.role, "asset:upload");
    } catch {
      return NextResponse.json({ error: "Bạn không có quyền tải tư liệu." }, { status: 403 });
    }
    if (Number(req.headers.get("content-length")) > MAX_FILE_SIZE + 1024 * 1024) {
      return NextResponse.json({ error: "Yêu cầu tải lên vượt giới hạn." }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const narratorId = (formData.get("narrator_id") as string) || null;
    const description = (formData.get("description") as string) || null;
    const durationSecondsRaw = formData.get("duration_seconds") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu tệp tải lên." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Kích thước tệp vượt quá giới hạn cho phép (50MB)." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `Định dạng tệp '${ext}' không được hỗ trợ.` }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tiêu đề không được để trống." }, { status: 400 });
    }

    // Xác định asset_type
    let assetType: AssetType = "document";
    const mimeType = file.type || "application/octet-stream";
    if (mimeType.startsWith("audio/") || [".mp3", ".wav", ".webm", ".m4a", ".ogg"].includes(ext)) {
      assetType = "audio";
    } else if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      assetType = "image";
    }

    // Đọc buffer và tính checksum sha256
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Tạo thư mục lưu trữ cục bộ an toàn
    const uploadDir = path.join(dataRoot, "uploads", workspaceId);
    const safeFileName = `${crypto.randomUUID()}${ext}`;

    const durationSeconds = durationSecondsRaw ? parseFloat(durationSecondsRaw) : null;

    // Lưu vào cơ sở dữ liệu
    const input = CreateAssetSchema.parse({
      workspace_id: workspaceId,
      asset_type: assetType,
      file_name: file.name,
      file_path: `/api/workspaces/${workspaceId}/assets/${safeFileName}/download`,
      mime_type: mimeType,
      byte_size: buffer.length,
      checksum,
      duration_seconds: durationSeconds,
      narrator_id: narratorId,
      title: title.trim(),
      description,
      shared_with_family: formData.get("shared_with_family") === "true",
    });
    fs.mkdirSync(uploadDir, { recursive: true });
    targetFilePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(targetFilePath, buffer, { flag: "wx" });
    const asset = db.transaction
      ? await db.transaction((tx) => new AssetService(tx).createAsset(userId, input))
      : await new AssetService(db).createAsset(userId, input);
    targetFilePath = null;

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    // Dọn dẹp tệp dở nếu ghi tệp thành công nhưng lưu DB thất bại
    if (targetFilePath && fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ error: err.message || "Tải lên thất bại." }, { status: 500 });
  }
}
