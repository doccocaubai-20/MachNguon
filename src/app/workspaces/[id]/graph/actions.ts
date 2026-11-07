"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { GraphService } from "@/lib/server/graph.service";
import { CreateGraphEntitySchema, CreateGraphClaimSchema } from "@/contracts/graph.contract";

export async function createEntityAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new GraphService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const rawAliases = (formData.get("aliases") as string) || "";
  const aliases = rawAliases
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const raw = {
    entity_type: formData.get("entity_type") as any,
    name: formData.get("name") as string,
    aliases,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = CreateGraphEntitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu nút thực thể không hợp lệ.");
  }

  await service.createEntity(userId, workspaceId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/graph`);
  redirect(`/workspaces/${workspaceId}/graph`);
}

export async function createClaimAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new GraphService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const startTime = formData.get("start_time_seconds");
  const endTime = formData.get("end_time_seconds");

  const raw = {
    source_entity_id: formData.get("source_entity_id") as string,
    target_entity_id: formData.get("target_entity_id") as string,
    relation_type: formData.get("relation_type") as string,
    statement: formData.get("statement") as string,
    status: (formData.get("status") as any) || "unverified",
    evidence_asset_id: (formData.get("evidence_asset_id") as string) || undefined,
    evidence_quote: (formData.get("evidence_quote") as string) || undefined,
    start_time_seconds: startTime ? Number(startTime) : undefined,
    end_time_seconds: endTime ? Number(endTime) : undefined,
  };

  const parsed = CreateGraphClaimSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu liên kết không hợp lệ.");
  }

  await service.createClaim(userId, workspaceId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/graph`);
  redirect(`/workspaces/${workspaceId}/graph`);
}

export async function confirmClaimAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new GraphService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const claimId = formData.get("claim_id") as string;

  await service.confirmClaim(userId, workspaceId, claimId);
  revalidatePath(`/workspaces/${workspaceId}/graph`);
}

export async function rejectClaimAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new GraphService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const claimId = formData.get("claim_id") as string;

  await service.rejectClaim(userId, workspaceId, claimId);
  revalidatePath(`/workspaces/${workspaceId}/graph`);
}
