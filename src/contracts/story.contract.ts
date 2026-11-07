import { z } from "zod";

export const StoryStatusEnum = z.enum(["draft", "pending_approval", "approved", "rejected"]);
export type StoryStatus = z.infer<typeof StoryStatusEnum>;

export const TranscriptSegmentSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  segment_order: z.number().int().nonnegative(),
  start_time_seconds: z.number().nonnegative(),
  end_time_seconds: z.number().nonnegative(),
  speaker: z.string().nullable().optional(),
  text: z.string().min(1, "Nội dung đoạn gỡ băng không được để trống"),
  needs_review: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const StorySchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  narrator_id: z.string().uuid().nullable().optional(),
  primary_asset_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2, "Tiêu đề câu chuyện phải từ 2 ký tự trở lên").max(200),
  summary: z.string().trim().max(1000).nullable().optional(),
  content: z.string().trim().min(10, "Nội dung câu chuyện phải từ 10 ký tự trở lên"),
  category: z.string().default("general"),
  status: StoryStatusEnum,
  version_number: z.number().int().positive().default(1),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Story = z.infer<typeof StorySchema>;

export const StoryEvidenceRefSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  start_time_seconds: z.number().nonnegative().nullable().optional(),
  end_time_seconds: z.number().nonnegative().nullable().optional(),
  quote_text: z.string().min(1),
  created_at: z.string().datetime(),
});
export type StoryEvidenceRef = z.infer<typeof StoryEvidenceRefSchema>;

export const CreateStorySchema = z.object({
  workspace_id: z.string().uuid(),
  narrator_id: z.string().uuid().optional().nullable(),
  primary_asset_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().max(1000).optional().nullable(),
  content: z.string().trim().min(10),
  category: z.string().default("general"),
  status: StoryStatusEnum.default("pending_approval"),
});
export type CreateStoryInput = z.infer<typeof CreateStorySchema>;

export const AddEvidenceRefSchema = z.object({
  story_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  start_time_seconds: z.number().nonnegative().optional().nullable(),
  end_time_seconds: z.number().nonnegative().optional().nullable(),
  quote_text: z.string().min(1),
});
export type AddEvidenceRefInput = z.infer<typeof AddEvidenceRefSchema>;

export interface StoryDetailView extends Story {
  narrator_name?: string | null;
  author_name: string;
  primary_asset_title?: string | null;
  primary_asset_path?: string | null;
  evidence_refs: Array<StoryEvidenceRef & { asset_title?: string; asset_path?: string }>;
}
