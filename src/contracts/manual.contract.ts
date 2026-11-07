import { z } from "zod";

export const ManualStatusEnum = z.enum(["draft", "pending_approval", "approved"]);
export type ManualStatus = z.infer<typeof ManualStatusEnum>;

export const ManualIngredientSchema = z.object({
  name: z.string().trim().min(1, "Tên nguyên liệu/dụng cụ không được để trống"),
  amount: z.string().trim().default(""),
  category: z.enum(["ingredient", "tool", "seasoning"]).default("ingredient"),
  notes: z.string().trim().nullable().optional(),
});
export type ManualIngredient = z.infer<typeof ManualIngredientSchema>;

export const ManualStepSchema = z.object({
  step_number: z.number().int().positive(),
  title: z.string().trim().min(2, "Tiêu đề bước phải từ 2 ký tự"),
  instructions: z.string().trim().min(5, "Nội dung hướng dẫn phải từ 5 ký tự"),
  success_signs: z.string().trim().min(2, "Vui lòng nhập dấu hiệu làm đúng để người học kiểm chứng"),
  evidence_asset_id: z.string().uuid().nullable().optional(),
  evidence_quote: z.string().trim().nullable().optional(),
  start_time_seconds: z.number().nonnegative().nullable().optional(),
  end_time_seconds: z.number().nonnegative().nullable().optional(),
  photo_asset_id: z.string().uuid().nullable().optional(),
});
export type ManualStep = z.infer<typeof ManualStepSchema>;

export const PracticeNoteSchema = z.object({
  id: z.string().uuid(),
  manual_id: z.string().uuid(),
  user_id: z.string().uuid(),
  author_name: z.string(),
  question: z.string().trim().min(3, "Nội dung câu hỏi phải từ 3 ký tự"),
  answer: z.string().trim().nullable().optional(),
  answered_by: z.string().uuid().nullable().optional(),
  answered_by_name: z.string().nullable().optional(),
  answered_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});
export type PracticeNote = z.infer<typeof PracticeNoteSchema>;

export const PracticeManualSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  skill_entity_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2, "Tiêu đề cẩm nang phải từ 2 ký tự").max(200),
  summary: z.string().trim().nullable().optional(),
  cover_asset_id: z.string().uuid().nullable().optional(),
  status: ManualStatusEnum.default("draft"),
  version_number: z.number().int().positive().default(1),
  ingredients: z.array(ManualIngredientSchema).default([]),
  steps: z.array(ManualStepSchema).default([]),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  notes: z.array(PracticeNoteSchema).optional().default([]),
});
export type PracticeManual = z.infer<typeof PracticeManualSchema>;

export const CreatePracticeManualSchema = z.object({
  skill_entity_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2, "Tiêu đề cẩm nang phải từ 2 ký tự").max(200),
  summary: z.string().trim().optional().nullable(),
  cover_asset_id: z.string().uuid().optional().nullable(),
  status: ManualStatusEnum.default("pending_approval"),
  ingredients: z.array(ManualIngredientSchema).default([]),
  steps: z.array(ManualStepSchema).min(1, "Cẩm nang thực hành phải có ít nhất 1 bước"),
});
export type CreatePracticeManualDto = z.infer<typeof CreatePracticeManualSchema>;

export const AddPracticeNoteSchema = z.object({
  manual_id: z.string().uuid(),
  question: z.string().trim().min(3, "Nội dung câu hỏi thắc mắc phải từ 3 ký tự"),
});
export type AddPracticeNoteDto = z.infer<typeof AddPracticeNoteSchema>;

export const AnswerPracticeNoteSchema = z.object({
  note_id: z.string().uuid(),
  answer: z.string().trim().min(2, "Nội dung giải đáp phải từ 2 ký tự"),
});
export type AnswerPracticeNoteDto = z.infer<typeof AnswerPracticeNoteSchema>;
