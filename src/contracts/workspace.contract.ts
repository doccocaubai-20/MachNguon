import { z } from "zod";

export const WorkspaceRoleEnum = z.enum(["admin", "contributor", "viewer", "narrator"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleEnum>;

export const MembershipStatusEnum = z.enum(["active", "revoked"]);
export type MembershipStatus = z.infer<typeof MembershipStatusEnum>;

export const InvitationStatusEnum = z.enum(["pending", "accepted", "revoked", "expired"]);
export type InvitationStatus = z.infer<typeof InvitationStatusEnum>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Tên kho gia đình phải có ít nhất 2 ký tự").max(100, "Tên kho không vượt quá 100 ký tự"),
  description: z.string().max(500, "Mô tả không vượt quá 500 ký tự").nullable().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Tên kho gia đình phải từ 2 đến 100 ký tự").max(100),
  description: z.string().trim().max(500).optional().nullable(),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: WorkspaceRoleEnum,
  status: MembershipStatusEnum,
  invited_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const InviteMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  email: z.string().email("Email không hợp lệ").toLowerCase(),
  role: WorkspaceRoleEnum,
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  workspace_id: z.string().uuid(),
  member_id: z.string().uuid(),
  role: WorkspaceRoleEnum,
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const RevokeMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  member_id: z.string().uuid(),
});
export type RevokeMemberInput = z.infer<typeof RevokeMemberSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable().optional(),
  details: z.record(z.any()).nullable().optional(),
  created_at: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
