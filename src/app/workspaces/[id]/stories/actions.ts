"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { StoryService } from "@/lib/server/story.service";
import { CreateStorySchema, AddEvidenceRefSchema } from "@/contracts/story.contract";

export async function createStoryAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new StoryService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const raw = {
    workspace_id: workspaceId,
    title: formData.get("title") as string,
    narrator_id: (formData.get("narrator_id") as string) || null,
    primary_asset_id: (formData.get("primary_asset_id") as string) || null,
    summary: (formData.get("summary") as string) || null,
    content: formData.get("content") as string,
    category: (formData.get("category") as string) || "general",
    status: "pending_approval" as const,
  };

  const parsed = CreateStorySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu câu chuyện không hợp lệ.");
  }

  const story = await service.createStory(userId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/stories`);
  redirect(`/workspaces/${workspaceId}/stories/${story.id}`);
}

export async function approveStoryAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const workspaceId = formData.get("workspace_id") as string;
  const storyId = formData.get("story_id") as string;

  await db.transaction((tx) => new StoryService(tx).approveStory(userId, workspaceId, storyId));
  revalidatePath(`/workspaces/${workspaceId}/stories/${storyId}`);
  revalidatePath(`/workspaces/${workspaceId}/stories`);
}

export async function updateStoryAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const input = CreateStorySchema.pick({ workspace_id: true, title: true, content: true }).parse({
    workspace_id: formData.get("workspace_id"),
    title: formData.get("title"),
    content: formData.get("content"),
  });
  const storyId = String(formData.get("story_id") ?? "");
  const db = await getDb();
  await db.transaction((tx) => new StoryService(tx).updateStory(userId, input.workspace_id, storyId, {
    title: input.title, content: input.content,
  }));
  revalidatePath(`/workspaces/${input.workspace_id}/stories`);
}

export async function appendTranscriptAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const storyId = String(formData.get("story_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const start = formData.get("start");
  const end = formData.get("end");
  if (typeof start !== "string" || !start.trim() || typeof end !== "string" || !end.trim()) {
    throw new Error("Nhập mốc bắt đầu và kết thúc.");
  }
  const db = await getDb();
  await db.transaction(async (tx) => {
    const service = new StoryService(tx);
    const story = await service.getStory(userId, workspaceId, storyId);
    if (!story.primary_asset_id || story.status === "approved" || story.created_by !== userId) {
      throw new Error("Chỉ người soạn có thể thêm đoạn chép lời vào bản nháp có nguồn âm thanh.");
    }
    const approved = await tx.query(
      "SELECT id FROM stories WHERE workspace_id = $1 AND primary_asset_id = $2 AND status = 'approved' LIMIT 1",
      [workspaceId, story.primary_asset_id]
    );
    if (approved.rows.length) throw new Error("Bản ghi đã có câu chuyện được duyệt.");
    const segments = await service.getTranscript(userId, workspaceId, story.primary_asset_id);
    const order = segments.reduce((next, segment) => Math.max(next, segment.segment_order + 1), 0);
    await service.saveTranscriptSegments(userId, workspaceId, story.primary_asset_id, [
      { order, startTime: Number(start), endTime: Number(end), text, needsReview: true },
    ]);
  });
  revalidatePath(`/workspaces/${workspaceId}/stories/${storyId}`);
}

export async function addEvidenceAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();

  const workspaceId = formData.get("workspace_id") as string;
  const storyId = formData.get("story_id") as string;
  const assetId = formData.get("asset_id") as string;
  const startTimeRaw = formData.get("start_time_seconds") as string;
  const quoteText = formData.get("quote_text") as string;

  const parsed = AddEvidenceRefSchema.safeParse({
    story_id: storyId,
    asset_id: assetId,
    start_time_seconds: startTimeRaw ? parseFloat(startTimeRaw) : null,
    quote_text: quoteText,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu trích dẫn không hợp lệ.");
  }

  await db.transaction((tx) => new StoryService(tx).addEvidenceRef(userId, workspaceId, parsed.data));
  revalidatePath(`/workspaces/${workspaceId}/stories/${storyId}`);
}
