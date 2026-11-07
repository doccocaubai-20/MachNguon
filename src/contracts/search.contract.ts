import { z } from "zod";

export const SearchResultTypeEnum = z.enum([
  "person",
  "asset",
  "story",
  "timeline",
  "entity",
  "manual",
]);
export type SearchResultType = z.infer<typeof SearchResultTypeEnum>;

export const SearchResultItemSchema = z.object({
  id: z.string(),
  type: SearchResultTypeEnum,
  title: z.string(),
  snippet: z.string(),
  url: z.string(),
  matched_field: z.string(),
  date_or_year: z.string().nullable().optional(),
  created_at: z.string(),
  metadata: z.record(z.any()).optional().default({}),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const SearchFilterSchema = z.object({
  query: z.string().trim().min(1, "Vui lòng nhập từ khóa tìm kiếm"),
  type: SearchResultTypeEnum.optional(),
});
export type SearchFilterDto = z.infer<typeof SearchFilterSchema>;

export const QACitationSchema = z.object({
  source_id: z.string(),
  source_type: z.enum(["story", "asset", "manual", "timeline", "claim"]),
  source_title: z.string(),
  quote_text: z.string(),
  asset_id: z.string().uuid().nullable().optional(),
  start_time_seconds: z.number().nullable().optional(),
  end_time_seconds: z.number().nullable().optional(),
  url: z.string(),
});
export type QACitation = z.infer<typeof QACitationSchema>;

export const QAResponseSchema = z.object({
  question: z.string(),
  has_sufficient_data: z.boolean(),
  answer: z.string(),
  citations: z.array(QACitationSchema).default([]),
  suggested_questions: z.array(z.string()).optional().default([]),
  ai_generated: z.boolean().optional(),
  base_answer: z.string().optional(),
});
export type QAResponse = z.infer<typeof QAResponseSchema>;

export const AskQuestionSchema = z.object({
  question: z.string().trim().min(2, "Vui lòng nhập câu hỏi từ 2 ký tự trở lên"),
});
export type AskQuestionDto = z.infer<typeof AskQuestionSchema>;
