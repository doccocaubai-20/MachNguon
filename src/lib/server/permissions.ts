import { WorkspaceRole } from "@/contracts/workspace.contract";

export type WorkspacePermission =
  | "workspace:manage"        // Sửa thông tin, cấu hình kho
  | "workspace:export"        // Đề nghị xuất kho ZIP
  | "member:invite"          // Mời thành viên mới
  | "member:update_role"     // Đổi vai trò thành viên
  | "member:revoke"          // Thu hồi quyền thành viên
  | "asset:upload"           // Tải tư liệu, ghi âm
  | "asset:delete_own"       // Xóa tư liệu do mình tải
  | "story:propose"          // Viết bản nháp, đề xuất câu chuyện
  | "story:edit"             // Chỉnh sửa bản thảo được giao
  | "story:approve"          // Người kể duyệt nội dung do mình chia sẻ
  | "timeline:create"        // Tạo sự kiện dòng thời gian
  | "timeline:edit"          // Sửa sự kiện dòng thời gian
  | "timeline:delete"        // Xóa sự kiện dòng thời gian
  | "graph:create"           // Tạo node và liên kết tri thức (P06)
  | "graph:confirm"          // Xác nhận / duyệt claim liên kết tri thức (P06)
  | "manual:create"          // Tạo cẩm nang tủ kinh nghiệm (P07)
  | "manual:approve"         // Duyệt cẩm nang thực hành (P07)
  | "manual:note"            // Gửi câu hỏi / thắc mắc thực hành (P07)
  | "manual:answer"          // Trả lời thắc mắc thực hành (P07)
  | "knowledge:explore"      // Xem dòng thời gian, bản đồ, tủ kinh nghiệm đã duyệt
  | "qa:ask";                // Hỏi đáp trên dữ liệu được phép xem

export const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  admin: [
    "workspace:manage",
    "workspace:export",
    "member:invite",
    "member:update_role",
    "member:revoke",
    "asset:upload",
    "asset:delete_own",
    "story:propose",
    "story:edit",
    "timeline:create",
    "timeline:edit",
    "timeline:delete",
    "graph:create",
    "graph:confirm",
    "manual:create",
    "manual:approve",
    "manual:note",
    "manual:answer",
    "knowledge:explore",
    "qa:ask",
  ],
  contributor: [
    "asset:upload",
    "asset:delete_own",
    "story:propose",
    "story:edit",
    "timeline:create",
    "timeline:edit",
    "timeline:delete",
    "graph:create",
    "manual:create",
    "manual:note",
    "knowledge:explore",
    "qa:ask",
  ],
  viewer: [
    "manual:note",
    "knowledge:explore",
    "qa:ask",
  ],
  narrator: [
    "asset:upload",
    "story:approve",         // Đặc quyền của người kể: duyệt câu chuyện của mình
    "timeline:create",
    "timeline:edit",
    "graph:create",
    "graph:confirm",
    "manual:create",
    "manual:approve",
    "manual:note",
    "manual:answer",
    "knowledge:explore",
    "qa:ask",
  ],
};

export function hasPermission(role: WorkspaceRole, permission: WorkspacePermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertPermission(role: WorkspaceRole, permission: WorkspacePermission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Từ chối quyền: Vai trò '${role}' không có quyền '${permission}'.`);
  }
}
