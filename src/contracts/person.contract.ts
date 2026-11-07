import { z } from "zod";

export const GenderEnum = z.enum(["male", "female", "other"]);
export type Gender = z.infer<typeof GenderEnum>;

export const RelationshipTypeEnum = z.enum([
  "parent",        // Cha / Mẹ
  "child",         // Con
  "spouse",        // Vợ / Chồng
  "sibling",       // Anh / Chị / Em ruột
  "grandparent",   // Ông / Bà
  "grandchild",    // Cháu nội / Cháu ngoại
  "relative",      // Họ hàng / Bác / Chú / Cô / Dì
]);
export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;

export const PersonSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  full_name: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự").max(100),
  nick_name: z.string().trim().max(100).nullable().optional(),
  gender: GenderEnum.optional().nullable(),
  birth_date: z.string().trim().max(50).nullable().optional(), // Hỗ trợ năm sinh gần đúng hoặc khoảng năm (VD: "1945", "Khoảng 1940-1945")
  death_date: z.string().trim().max(50).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  linked_user_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Person = z.infer<typeof PersonSchema>;

export const CreatePersonSchema = z.object({
  workspace_id: z.string().uuid(),
  full_name: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự").max(100),
  nick_name: z.string().trim().max(100).optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  birth_date: z.string().trim().max(50).optional().nullable(),
  death_date: z.string().trim().max(50).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  linked_user_id: z.string().uuid().optional().nullable(),
});
export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;

export const UpdatePersonSchema = z.object({
  workspace_id: z.string().uuid(),
  person_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(100).optional(),
  nick_name: z.string().trim().max(100).optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  birth_date: z.string().trim().max(50).optional().nullable(),
  death_date: z.string().trim().max(50).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  linked_user_id: z.string().uuid().optional().nullable(),
});
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

export const AddRelationshipSchema = z.object({
  workspace_id: z.string().uuid(),
  person_id: z.string().uuid(),
  related_person_id: z.string().uuid(),
  relationship_type: RelationshipTypeEnum,
  notes: z.string().trim().max(200).optional().nullable(),
});
export type AddRelationshipInput = z.infer<typeof AddRelationshipSchema>;
