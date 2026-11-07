import { randomBytes } from "node:crypto";
import {
  CreateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  RevokeMemberInput,
  WorkspaceRole,
  Membership,
  Workspace,
} from "@/contracts/workspace.contract";
import { assertPermission } from "./permissions";

export interface DatabaseExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<any>;
  transaction<T>(fn: (tx: DatabaseExecutor) => Promise<T>): Promise<T>;
}

export class WorkspaceService {
  constructor(private db: DatabaseExecutor) {}

  /**
   * Tạo kho gia đình mới và tự động gán người tạo làm Quản trị viên (admin)
   */
  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    const wsRes = await this.db.query<Workspace>(
      `INSERT INTO workspaces (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.name, input.description || null, userId]
    );
    const workspace = wsRes.rows[0];

    // Tạo membership admin ban đầu cho người tạo
    await this.db.query(
      `INSERT INTO memberships (workspace_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')`,
      [workspace.id, userId]
    );

    // Ghi audit event
    await this.logAuditEvent(workspace.id, userId, "WORKSPACE_CREATED", "workspace", workspace.id, {
      name: workspace.name,
    });

    return workspace;
  }

  /**
   * Lấy thông tin kho gia đình nếu user là thành viên đang hoạt động (active)
   */
  async getWorkspace(userId: string, workspaceId: string): Promise<{ workspace: Workspace; currentMember: Membership }> {
    const memRes = await this.db.query<Membership>(
      `SELECT * FROM memberships
       WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'`,
      [workspaceId, userId]
    );

    if (memRes.rows.length === 0) {
      throw new Error("Truy cập bị từ chối: Bạn không phải thành viên hợp lệ của kho này.");
    }

    const currentMember = memRes.rows[0];

    const wsRes = await this.db.query<Workspace>(
      `SELECT * FROM workspaces WHERE id = $1`,
      [workspaceId]
    );

    if (wsRes.rows.length === 0) {
      throw new Error("Không tìm thấy kho gia đình.");
    }

    return { workspace: wsRes.rows[0], currentMember };
  }

  /**
   * Lấy danh sách các kho gia đình mà user đang là thành viên active
   */
  async listUserWorkspaces(userId: string): Promise<Array<Workspace & { role: WorkspaceRole }>> {
    const res = await this.db.query<Workspace & { role: WorkspaceRole }>(
      `SELECT w.*, m.role
       FROM workspaces w
       JOIN memberships m ON m.workspace_id = w.id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  /**
   * Mời thành viên mới vào kho gia đình (Chỉ admin mới có quyền)
   */
  async inviteMember(userId: string, input: InviteMemberInput): Promise<{ invitationId: string; token: string }> {
    const { currentMember } = await this.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "member:invite");

    // Kiểm tra xem user được mời đã có tài khoản profile chưa
    const profileRes = await this.db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)`,
      [input.email]
    );

    if (profileRes.rows.length > 0) {
      const targetUserId = profileRes.rows[0].id;
      // Kiểm tra membership hiện tại
      const memRes = await this.db.query<Membership>(
        `SELECT * FROM memberships WHERE workspace_id = $1 AND user_id = $2`,
        [input.workspace_id, targetUserId]
      );

      if (memRes.rows.length > 0) {
        if (memRes.rows[0].status === "active") {
          throw new Error(`Thành viên '${input.email}' đã có mặt trong kho gia đình.`);
        } else {
          // Kích hoạt lại (reactivate) thành viên đã từng bị thu hồi
          await this.db.query(
            `UPDATE memberships
             SET status = 'active', role = $1, invited_by = $2, updated_at = NOW()
             WHERE id = $3`,
            [input.role, userId, memRes.rows[0].id]
          );

          await this.logAuditEvent(input.workspace_id, userId, "MEMBER_REACTIVATED", "membership", memRes.rows[0].id, {
            email: input.email,
            role: input.role,
          });

          return { invitationId: memRes.rows[0].id, token: "DIRECT_REACTIVATED" };
        }
      }
    }

    // Tạo token lời mời
    const token = `inv_${randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 ngày

    const invRes = await this.db.query<{ id: string }>(
      `INSERT INTO workspace_invitations (workspace_id, email, role, token, status, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING id`,
      [input.workspace_id, input.email.toLowerCase(), input.role, token, userId, expiresAt]
    );

    await this.logAuditEvent(input.workspace_id, userId, "INVITATION_CREATED", "invitation", invRes.rows[0].id, {
      email: input.email,
      role: input.role,
    });

    return { invitationId: invRes.rows[0].id, token };
  }

  /**
   * Thêm trực tiếp thành viên vào kho (Dành cho Admin khi đã xác định rõ user)
   */
  async addMemberDirectly(
    adminUserId: string,
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole
  ): Promise<Membership> {
    const { currentMember } = await this.getWorkspace(adminUserId, workspaceId);
    assertPermission(currentMember.role, "member:invite");

    const memRes = await this.db.query<Membership>(
      `INSERT INTO memberships (workspace_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET status = 'active', role = EXCLUDED.role, updated_at = NOW()
       RETURNING *`,
      [workspaceId, targetUserId, role, adminUserId]
    );

    await this.logAuditEvent(workspaceId, adminUserId, "MEMBER_ADDED_DIRECT", "membership", memRes.rows[0].id, {
      target_user_id: targetUserId,
      role,
    });

    return memRes.rows[0];
  }

  /**
   * Chấp nhận lời mời tham gia kho
   */
  async acceptInvitation(userId: string, token: string): Promise<Membership> {
    const invRes = await this.db.query<{
      id: string;
      workspace_id: string;
      email: string;
      role: WorkspaceRole;
      status: string;
      invited_by: string;
      expires_at: string;
    }>(
      `SELECT * FROM workspace_invitations WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    if (invRes.rows.length === 0) {
      throw new Error("Lời mời không tồn tại hoặc đã hết hạn/đã được sử dụng.");
    }

    const invitation = invRes.rows[0];
    if (new Date(invitation.expires_at) < new Date()) {
      await this.db.query(
        `UPDATE workspace_invitations SET status = 'expired' WHERE id = $1`,
        [invitation.id]
      );
      throw new Error("Lời mời đã hết hạn.");
    }

    // Kiểm tra email người nhận phải khớp chính xác với email trong lời mời
    const userProfileRes = await this.db.query<{ email: string }>(
      `SELECT email FROM profiles WHERE id = $1`,
      [userId]
    );

    if (userProfileRes.rows.length === 0) {
      throw new Error("Tài khoản người dùng không tồn tại.");
    }

    const userEmail = userProfileRes.rows[0].email.toLowerCase().trim();
    const inviteEmail = invitation.email.toLowerCase().trim();

    if (userEmail !== inviteEmail) {
      throw new Error(
        `Lời mời này được gửi đích danh đến email '${invitation.email}', tài khoản hiện tại (${userEmail}) không có quyền nhận.`
      );
    }

    const memRes = await this.db.query<Membership>(
      `WITH accepted AS (
         UPDATE workspace_invitations SET status = 'accepted'
         WHERE id = $1 AND status = 'pending' AND expires_at > NOW()
         RETURNING workspace_id, role, invited_by
       )
       INSERT INTO memberships (workspace_id, user_id, role, status, invited_by)
       SELECT workspace_id, $2, role, 'active', invited_by FROM accepted
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET status = 'active',
         role = CASE WHEN memberships.status = 'revoked' THEN EXCLUDED.role ELSE memberships.role END,
         updated_at = NOW()
       RETURNING *`,
      [invitation.id, userId]
    );
    if (!memRes.rows.length) throw new Error("Lời mời không tồn tại hoặc đã hết hạn/đã được sử dụng.");

    await this.logAuditEvent(invitation.workspace_id, userId, "INVITATION_ACCEPTED", "membership", memRes.rows[0].id, {
      role: invitation.role,
      email: invitation.email,
    });

    return memRes.rows[0];
  }

  /**
   * Cập nhật vai trò thành viên (admin, contributor, viewer, narrator)
   */
  async updateMemberRole(userId: string, input: UpdateMemberRoleInput): Promise<Membership> {
    const { currentMember } = await this.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "member:update_role");

    // Lấy thông tin thành viên cần cập nhật
    const targetMemRes = await this.db.query<Membership>(
      `SELECT * FROM memberships WHERE id = $1 AND workspace_id = $2`,
      [input.member_id, input.workspace_id]
    );

    if (targetMemRes.rows.length === 0) {
      throw new Error("Không tìm thấy thành viên trong kho.");
    }

    const targetMember = targetMemRes.rows[0];

    // Không được hạ cấp admin cuối cùng của kho
    if (targetMember.role === "admin" && input.role !== "admin") {
      const adminCountRes = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM memberships
         WHERE workspace_id = $1 AND role = 'admin' AND status = 'active'`,
        [input.workspace_id]
      );
      if (parseInt(adminCountRes.rows[0].count, 10) <= 1) {
        throw new Error("Kho gia đình phải có ít nhất 1 Quản trị viên (admin).");
      }
    }

    const updatedRes = await this.db.query<Membership>(
      `UPDATE memberships
       SET role = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING *`,
      [input.role, input.member_id, input.workspace_id]
    );

    await this.logAuditEvent(input.workspace_id, userId, "MEMBER_ROLE_UPDATED", "membership", input.member_id, {
      old_role: targetMember.role,
      new_role: input.role,
    });

    return updatedRes.rows[0];
  }

  /**
   * Thu hồi quyền thành viên (Revoke)
   * Khi thu hồi, status chuyển sang 'revoked', lập tức mất toàn bộ quyền truy cập kho
   */
  async revokeMember(userId: string, input: RevokeMemberInput): Promise<Membership> {
    const { currentMember } = await this.getWorkspace(userId, input.workspace_id);
    assertPermission(currentMember.role, "member:revoke");

    const targetMemRes = await this.db.query<Membership>(
      `SELECT * FROM memberships WHERE id = $1 AND workspace_id = $2`,
      [input.member_id, input.workspace_id]
    );

    if (targetMemRes.rows.length === 0) {
      throw new Error("Không tìm thấy thành viên.");
    }

    const targetMember = targetMemRes.rows[0];

    // Không được tự thu hồi chính mình nếu là admin cuối cùng
    if (targetMember.role === "admin") {
      const adminCountRes = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM memberships
         WHERE workspace_id = $1 AND role = 'admin' AND status = 'active'`,
        [input.workspace_id]
      );
      if (parseInt(adminCountRes.rows[0].count, 10) <= 1) {
        throw new Error("Không thể thu hồi Quản trị viên duy nhất còn lại của kho.");
      }
    }

    const updatedRes = await this.db.query<Membership>(
      `UPDATE memberships
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2
       RETURNING *`,
      [input.member_id, input.workspace_id]
    );

    await this.logAuditEvent(input.workspace_id, userId, "MEMBER_REVOKED", "membership", input.member_id, {
      revoked_user_id: targetMember.user_id,
      previous_role: targetMember.role,
    });

    return updatedRes.rows[0];
  }

  /**
   * Lấy danh sách thành viên trong kho gia đình
   */
  async getWorkspaceMembers(userId: string, workspaceId: string): Promise<Array<Membership & { full_name: string; email: string }>> {
    // Kiểm tra quyền: phải là thành viên active
    await this.getWorkspace(userId, workspaceId);

    const res = await this.db.query<Membership & { full_name: string; email: string }>(
      `SELECT m.*, p.full_name, p.email
       FROM memberships m
       JOIN profiles p ON p.id = m.user_id
       WHERE m.workspace_id = $1
       ORDER BY m.status ASC, m.role ASC, m.created_at ASC`,
      [workspaceId]
    );

    return res.rows;
  }

  private async logAuditEvent(
    workspaceId: string,
    userId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    details: Record<string, any>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_events (workspace_id, user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, action, targetType, targetId, JSON.stringify(details)]
    );
  }
}
