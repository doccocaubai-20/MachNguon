"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { dataRoot } from "@/lib/auth/mode";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { AssetService } from "@/lib/server/asset.service";

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new AssetService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const assetId = formData.get("asset_id") as string;

  const { deletedFilePath } = await service.deleteAsset(userId, workspaceId, assetId);

  // Nếu là file upload cục bộ thì dọn dẹp file
  if (deletedFilePath && deletedFilePath.includes("/download")) {
    const filename = path.basename(deletedFilePath.replace("/download", ""));
    const localPath = path.join(dataRoot, "uploads", workspaceId, filename);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        // Log & ignore
      }
    }
  }

  revalidatePath(`/workspaces/${workspaceId}/assets`);
}
