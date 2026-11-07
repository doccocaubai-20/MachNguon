import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "node:stream";
import { getCurrentUserIdOptional } from "@/lib/auth/session";
import { dataRoot } from "@/lib/auth/mode";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";

interface Props {
  params: Promise<{ id: string; filename: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id: workspaceId, filename } = await params;
    const userId = await getCurrentUserIdOptional();
    if (!userId) return new NextResponse("Yêu cầu đăng nhập.", { status: 401 });
    const db = await getDb();
    const wsService = new WorkspaceService(db);

    // Xác thực quyền truy cập: Người dùng phải là thành viên active của kho
    await wsService.getWorkspace(userId, workspaceId);

    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return new NextResponse("Không tìm thấy tư liệu.", { status: 404 });
    }

    // Tra cứu tư liệu trong DB và kiểm tra quyền trên tư liệu trước khi đọc tệp
    const assetCheck = await db.query<any>(
      `SELECT * FROM assets 
       WHERE workspace_id = $1 
         AND file_path = $2
         AND (shared_with_family OR uploaded_by = $3)
         AND status = 'ready'`,
      [workspaceId, `/api/workspaces/${workspaceId}/assets/${safeFilename}/download`, userId]
    );

    if (assetCheck.rows.length === 0) {
      return new NextResponse("Tư liệu không tồn tại trong kho hoặc đã bị xóa/thu hồi quyền.", { status: 404 });
    }

    const filePath = path.join(dataRoot, "uploads", workspaceId, safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Tệp vật lý không tồn tại trên máy chủ.", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    // Determine basic MIME type
    let mimeType = "application/octet-stream";
    if (safeFilename.endsWith(".webm") || safeFilename.endsWith(".mp3") || safeFilename.endsWith(".wav")) {
      mimeType = safeFilename.endsWith(".webm") ? "audio/webm" : safeFilename.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    } else if (safeFilename.endsWith(".jpg") || safeFilename.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (safeFilename.endsWith(".png")) {
      mimeType = "image/png";
    } else if (safeFilename.endsWith(".pdf")) {
      mimeType = "application/pdf";
    } else if (safeFilename.endsWith(".m4a")) {
      mimeType = "audio/mp4";
    } else if (safeFilename.endsWith(".ogg")) {
      mimeType = "audio/ogg";
    } else if (safeFilename.endsWith(".webp")) {
      mimeType = "image/webp";
    } else if (safeFilename.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Accept-Ranges", "bytes");
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match?.[2] || 0));
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) || start > end || end >= stat.size) {
        headers.set("Content-Range", `bytes */${stat.size}`);
        return new NextResponse(null, { status: 416, headers });
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      headers.set("Content-Length", String(end - start + 1));
      const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
      return new NextResponse(stream, { status: 206, headers });
    }

    headers.set("Content-Length", String(stat.size));
    const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>;
    return new NextResponse(stream, { headers });
  } catch {
    return new NextResponse("Truy cập bị từ chối.", { status: 403 });
  }
}
