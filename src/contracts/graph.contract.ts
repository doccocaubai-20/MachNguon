import { z } from "zod";

export const EntityTypeEnum = z.enum(["person", "place", "event", "skill"]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

export const ClaimStatusEnum = z.enum(["proposed", "unverified", "confirmed", "rejected"]);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

export const GraphEntitySchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  entity_type: EntityTypeEnum,
  name: z.string().trim().min(1, "Tên thực thể không được để trống").max(200),
  aliases: z.array(z.string()).default([]),
  description: z.string().trim().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GraphEntity = z.infer<typeof GraphEntitySchema>;

export const GraphClaimSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  source_entity_id: z.string().uuid(),
  target_entity_id: z.string().uuid(),
  relation_type: z.string().trim().min(1, "Loại quan hệ không được để trống").max(100),
  statement: z.string().trim().min(3, "Lời khẳng định liên kết phải từ 3 ký tự trở lên"),
  status: ClaimStatusEnum.default("proposed"),
  evidence_asset_id: z.string().uuid().nullable().optional(),
  evidence_quote: z.string().trim().nullable().optional(),
  start_time_seconds: z.number().nonnegative().nullable().optional(),
  end_time_seconds: z.number().nonnegative().nullable().optional(),
  created_by: z.string().uuid(),
  confirmed_by: z.string().uuid().nullable().optional(),
  confirmed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});
export type GraphClaim = z.infer<typeof GraphClaimSchema>;

export const CreateGraphEntitySchema = z.object({
  entity_type: EntityTypeEnum,
  name: z.string().trim().min(1, "Tên thực thể không được để trống").max(200),
  aliases: z.array(z.string()).optional().default([]),
  description: z.string().trim().optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
});
export type CreateGraphEntityDto = z.infer<typeof CreateGraphEntitySchema>;

export const CreateGraphClaimSchema = z.object({
  source_entity_id: z.string().uuid(),
  target_entity_id: z.string().uuid(),
  relation_type: z.string().trim().min(1, "Loại quan hệ không được để trống"),
  statement: z.string().trim().min(3, "Lời khẳng định liên kết phải từ 3 ký tự"),
  status: ClaimStatusEnum.default("unverified"),
  evidence_asset_id: z.string().uuid().optional().nullable(),
  evidence_quote: z.string().trim().optional().nullable(),
  start_time_seconds: z.number().nonnegative().optional().nullable(),
  end_time_seconds: z.number().nonnegative().optional().nullable(),
});
export type CreateGraphClaimDto = z.infer<typeof CreateGraphClaimSchema>;

export interface GraphEdgeWithNames extends GraphClaim {
  source_name: string;
  source_type: EntityType;
  target_name: string;
  target_type: EntityType;
  evidence_asset_title?: string | null;
  evidence_asset_file?: string | null;
}

export interface NeighborhoodGraphView {
  center_node: GraphEntity;
  nodes: GraphEntity[];
  edges: GraphEdgeWithNames[];
}

export interface FullGraphView {
  nodes: GraphEntity[];
  edges: GraphEdgeWithNames[];
}
