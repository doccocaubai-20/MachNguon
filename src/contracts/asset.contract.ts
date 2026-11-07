import { z } from "zod";

export const AssetTypeEnum = z.enum(["audio", "image", "document"]);
export type AssetType = z.infer<typeof AssetTypeEnum>;

export const AssetStatusEnum = z.enum(["uploading", "processing", "ready", "error"]);
export type AssetStatus = z.infer<typeof AssetStatusEnum>;

export const AssetSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  asset_type: AssetTypeEnum,
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  mime_type: z.string().min(1),
  byte_size: z.number().int().nonnegative(),
  checksum: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(), // Dành cho audio
  uploaded_by: z.string().uuid(),
  shared_with_family: z.boolean(),
  narrator_id: z.string().uuid().nullable().optional(), // Người kể chuyện trong tư liệu này
  title: z.string().trim().min(1, "Tiêu đề tư liệu không được để trống").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  status: AssetStatusEnum,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const CreateAssetSchema = z.object({
  shared_with_family: z.boolean().optional(),
  workspace_id: z.string().uuid(),
  asset_type: AssetTypeEnum,
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  mime_type: z.string().min(1),
  byte_size: z.number().int().nonnegative(),
  checksum: z.string().optional().nullable(),
  duration_seconds: z.number().optional().nullable(),
  narrator_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
});
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = z.object({
  workspace_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  narrator_id: z.string().uuid().optional().nullable(),
});
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

export interface AssetDetailView extends Asset {
  narrator_name?: string | null;
  uploader_name: string;
}
