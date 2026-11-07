import { z } from "zod";

export const DatePrecisionEnum = z.enum(["exact", "month", "year", "decade", "approximate"]);
export type DatePrecision = z.infer<typeof DatePrecisionEnum>;

export const TimelineImportanceEnum = z.enum(["normal", "milestone", "major"]);
export type TimelineImportance = z.infer<typeof TimelineImportanceEnum>;

export const TimelineEventPersonSchema = z.object({
  event_id: z.string().uuid(),
  person_id: z.string().uuid(),
  role_description: z.string().nullable().optional(),
  full_name: z.string().optional(),
  nick_name: z.string().nullable().optional(),
});
export type TimelineEventPerson = z.infer<typeof TimelineEventPersonSchema>;

export const TimelineEventAssetSchema = z.object({
  event_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  caption: z.string().nullable().optional(),
  asset_type: z.enum(["audio", "image", "document", "other"]).optional(),
  file_name: z.string().optional(),
  title: z.string().nullable().optional(),
});
export type TimelineEventAsset = z.infer<typeof TimelineEventAssetSchema>;

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().trim().min(2, "Tiêu đề sự kiện phải từ 2 ký tự trở lên").max(200),
  description: z.string().trim().nullable().optional(),
  event_date: z.string().nullable().optional(),
  year: z.number().int().min(1000).max(2100),
  year_end: z.number().int().min(1000).max(2100).nullish(),
  date_display: z.string().trim().min(1, "Ngày hiển thị không được để trống"),
  date_precision: DatePrecisionEnum.default("year"),
  location: z.string().trim().nullable().optional(),
  importance: TimelineImportanceEnum.default("normal"),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // Associated entities populated by service
  persons: z.array(TimelineEventPersonSchema).optional().default([]),
  assets: z.array(TimelineEventAssetSchema).optional().default([]),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const CreateTimelineEventSchema = z.object({
  title: z.string().trim().min(2, "Tiêu đề sự kiện phải từ 2 ký tự trở lên").max(200),
  description: z.string().trim().optional(),
  event_date: z.string().optional().nullable(),
  year: z.number().int().min(1000, "Năm không hợp lệ").max(2100, "Năm không hợp lệ"),
  year_end: z.number().int().min(1000).max(2100).nullish(),
  date_display: z.string().trim().min(1, "Vui lòng nhập ngày hiển thị (VD: Mùa thu 1965, Khoảng năm 1980)"),
  date_precision: DatePrecisionEnum.default("year"),
  location: z.string().trim().optional().nullable(),
  importance: TimelineImportanceEnum.default("normal"),
  person_ids: z.array(z.string().uuid()).optional().default([]),
  asset_ids: z.array(z.string().uuid()).optional().default([]),
});
export type CreateTimelineEventDto = z.infer<typeof CreateTimelineEventSchema>;

export const UpdateTimelineEventSchema = CreateTimelineEventSchema.partial();
export type UpdateTimelineEventDto = z.infer<typeof UpdateTimelineEventSchema>;

export const TimelineFilterSchema = z.object({
  query: z.string().optional(),
  person_id: z.string().uuid().optional(),
  importance: TimelineImportanceEnum.optional(),
  year_from: z.number().int().optional(),
  year_to: z.number().int().optional(),
});
export type TimelineFilterDto = z.infer<typeof TimelineFilterSchema>;
