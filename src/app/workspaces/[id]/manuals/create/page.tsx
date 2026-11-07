import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { AssetService } from "@/lib/server/asset.service";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { hasPermission } from "@/lib/server/permissions";
import ManualForm from "./ManualForm";

export default async function CreateManualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();
  const { currentMember } = await new WorkspaceService(db).getWorkspace(userId, id);
  if (!hasPermission(currentMember.role, "manual:create")) redirect(`/workspaces/${id}/manuals`);
  const assets = await new AssetService(db).listAssets(userId, id, { familyOnly: true });
  const sources = assets.filter((asset) => asset.status === "ready")
    .map(({ id, title, asset_type }) => ({ id, title, asset_type }));
  return <ManualForm workspaceId={id} sources={sources} />;
}
