"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { TimelineService } from "@/lib/server/timeline.service";
import { CreateTimelineEventSchema } from "@/contracts/timeline.contract";

export async function createTimelineEventAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();

  const workspaceId = formData.get("workspace_id") as string;
  const personIds = formData.getAll("person_ids") as string[];
  const assetIds = formData.getAll("asset_ids") as string[];

  const raw = {
    title: formData.get("title") as string,
    year: Number(formData.get("year")),
    year_end: formData.get("year_end") ? Number(formData.get("year_end")) : null,
    date_display: formData.get("date_display") as string,
    date_precision: (formData.get("date_precision") as any) || "year",
    description: (formData.get("description") as string) || undefined,
    location: (formData.get("location") as string) || undefined,
    importance: (formData.get("importance") as any) || "normal",
    person_ids: personIds.filter(Boolean),
    asset_ids: assetIds.filter(Boolean),
  };

  const parsed = CreateTimelineEventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu sự kiện không hợp lệ.");
  }

  await db.transaction((tx) => new TimelineService(tx).createEvent(userId, workspaceId, parsed.data));
  revalidatePath(`/workspaces/${workspaceId}/timeline`);
  redirect(`/workspaces/${workspaceId}/timeline`);
}

export async function updateTimelineEventAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();

  const workspaceId = formData.get("workspace_id") as string;
  const eventId = formData.get("event_id") as string;
  const personIds = formData.getAll("person_ids") as string[];
  const assetIds = formData.getAll("asset_ids") as string[];

  const raw: any = {};
  if (formData.has("title")) raw.title = formData.get("title") as string;
  if (formData.has("year")) raw.year = Number(formData.get("year"));
  if (formData.has("year_end")) raw.year_end = formData.get("year_end") ? Number(formData.get("year_end")) : null;
  if (formData.has("date_display")) raw.date_display = formData.get("date_display") as string;
  if (formData.has("date_precision")) raw.date_precision = formData.get("date_precision") as any;
  if (formData.has("description")) raw.description = formData.get("description") as string;
  if (formData.has("location")) raw.location = formData.get("location") as string;
  if (formData.has("importance")) raw.importance = formData.get("importance") as any;
  if (personIds.length > 0) raw.person_ids = personIds.filter(Boolean);
  if (assetIds.length > 0) raw.asset_ids = assetIds.filter(Boolean);

  await db.transaction((tx) => new TimelineService(tx).updateEvent(userId, workspaceId, eventId, raw));
  revalidatePath(`/workspaces/${workspaceId}/timeline`);
}

export async function deleteTimelineEventAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new TimelineService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const eventId = formData.get("event_id") as string;

  await service.deleteEvent(userId, workspaceId, eventId);
  revalidatePath(`/workspaces/${workspaceId}/timeline`);
}
