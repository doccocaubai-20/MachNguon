"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { ManualService } from "@/lib/server/manual.service";
import {
  CreatePracticeManualSchema,
  AddPracticeNoteSchema,
  AnswerPracticeNoteSchema,
} from "@/contracts/manual.contract";

export async function createManualAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new ManualService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const ingredientsJson = (formData.get("ingredients") as string) || "[]";
  const stepsJson = (formData.get("steps") as string) || "[]";

  const raw = {
    title: formData.get("title") as string,
    summary: (formData.get("summary") as string) || undefined,
    cover_asset_id: (formData.get("cover_asset_id") as string) || undefined,
    skill_entity_id: (formData.get("skill_entity_id") as string) || undefined,
    status: (formData.get("status") as any) || "pending_approval",
    ingredients: JSON.parse(ingredientsJson),
    steps: JSON.parse(stepsJson),
  };

  const parsed = CreatePracticeManualSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu cẩm nang không hợp lệ.");
  }

  const manual = await service.createManual(userId, workspaceId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/manuals`);
  redirect(`/workspaces/${workspaceId}/manuals/${manual.id}`);
}

export async function approveManualAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();

  const workspaceId = formData.get("workspace_id") as string;
  const manualId = formData.get("manual_id") as string;

  await db.transaction((tx) => new ManualService(tx).approveManual(userId, workspaceId, manualId));
  revalidatePath(`/workspaces/${workspaceId}/manuals/${manualId}`);
  revalidatePath(`/workspaces/${workspaceId}/manuals`);
}

export async function addPracticeNoteAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new ManualService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const manualId = formData.get("manual_id") as string;
  const question = formData.get("question") as string;

  const parsed = AddPracticeNoteSchema.safeParse({ manual_id: manualId, question });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Câu hỏi không hợp lệ.");
  }

  await service.addPracticeNote(userId, workspaceId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/manuals/${manualId}`);
}

export async function answerPracticeNoteAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new ManualService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const manualId = formData.get("manual_id") as string;
  const noteId = formData.get("note_id") as string;
  const answer = formData.get("answer") as string;

  const parsed = AnswerPracticeNoteSchema.safeParse({ note_id: noteId, answer });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Câu trả lời không hợp lệ.");
  }

  await service.answerPracticeNote(userId, workspaceId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/manuals/${manualId}`);
}

export async function deleteManualAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new ManualService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const manualId = formData.get("manual_id") as string;

  await service.deleteManual(userId, workspaceId, manualId);
  revalidatePath(`/workspaces/${workspaceId}/manuals`);
  redirect(`/workspaces/${workspaceId}/manuals`);
}
