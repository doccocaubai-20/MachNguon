"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/server/db";
import { getCurrentUserId, switchCurrentUser } from "@/lib/auth/session";
import { WorkspaceService } from "@/lib/server/workspace.service";
import {
  CreateWorkspaceSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  RevokeMemberSchema,
  WorkspaceRole,
} from "@/contracts/workspace.contract";

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new WorkspaceService(db);

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
  };

  const parsed = CreateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ.");
  }

  const ws = await service.createWorkspace(userId, parsed.data);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${ws.id}`);
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new WorkspaceService(db);

  const raw = {
    workspace_id: formData.get("workspace_id") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as WorkspaceRole,
  };

  const parsed = InviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu lời mời không hợp lệ.");
  }

  await service.inviteMember(userId, parsed.data);
  revalidatePath(`/workspaces/${raw.workspace_id}/members`);
}

export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const token = String(formData.get("token") ?? "").trim();
  if (!/^inv_[a-z0-9]{10,100}$/.test(token)) redirect("/workspaces?invite=invalid");
  const db = await getDb();
  let workspaceId: string;
  try {
    const membership = await db.transaction((tx) => new WorkspaceService(tx).acceptInvitation(userId, token));
    workspaceId = membership.workspace_id;
  } catch {
    redirect("/workspaces?invite=invalid");
  }
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}`);
}

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new WorkspaceService(db);

  const raw = {
    workspace_id: formData.get("workspace_id") as string,
    member_id: formData.get("member_id") as string,
    role: formData.get("role") as WorkspaceRole,
  };

  const parsed = UpdateMemberRoleSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu đổi vai trò không hợp lệ.");
  }

  await service.updateMemberRole(userId, parsed.data);
  revalidatePath(`/workspaces/${raw.workspace_id}/members`);
}

export async function revokeMemberAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new WorkspaceService(db);

  const raw = {
    workspace_id: formData.get("workspace_id") as string,
    member_id: formData.get("member_id") as string,
  };

  const parsed = RevokeMemberSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu thu hồi không hợp lệ.");
  }

  await service.revokeMember(userId, parsed.data);
  revalidatePath(`/workspaces/${raw.workspace_id}/members`);
  revalidatePath(`/workspaces/${raw.workspace_id}`);
  revalidatePath("/workspaces");
}

export async function switchUserAction(userId: string): Promise<void> {
  await switchCurrentUser(userId);
  revalidatePath("/");
  revalidatePath("/workspaces");
}
