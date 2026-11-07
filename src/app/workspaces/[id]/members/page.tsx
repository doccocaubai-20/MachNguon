import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { hasPermission } from "@/lib/server/permissions";
import { inviteMemberAction, updateMemberRoleAction, revokeMemberAction } from "@/app/workspaces/actions";
import { WorkspaceRole } from "@/contracts/workspace.contract";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceMembersPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const service = new WorkspaceService(db);

  let workspaceData;
  let members: Awaited<ReturnType<WorkspaceService["getWorkspaceMembers"]>> = [];
  try {
    const [wsData, membersData] = await Promise.all([
      service.getWorkspace(currentUser.id, id),
      service.getWorkspaceMembers(currentUser.id, id),
    ]);
    workspaceData = wsData;
    members = membersData;
  } catch (err: any) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">
          Bạn không có quyền xem thông tin thành viên của kho này hoặc quyền truy cập đã bị thu hồi.
        </p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const isAdmin = hasPermission(currentMember.role, "member:invite");
  const invitations = isAdmin
    ? (await db.query<{ id: string; email: string; token: string }>(
      `SELECT id, email, token FROM workspace_invitations
       WHERE workspace_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`, [workspace.id]
    )).rows
    : [];

  // Lấy danh sách audit events gần nhất
  const auditRes = await db.query<{
    id: string;
    action: string;
    target_type: string;
    created_at: string;
    details: any;
  }>(
    `SELECT * FROM audit_events WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [id]
  );
  const auditLogs = auditRes.rows;

  const roleMeta: Record<WorkspaceRole, { name: string; badge: string; desc: string }> = {
    admin: {
      name: "Quản trị viên kho",
      badge: "bg-forest/10 text-forest border-forest/30",
      desc: "Quản lý kho, mời/thu hồi thành viên",
    },
    contributor: {
      name: "Người đóng góp",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      desc: "Tải tư liệu, ghi âm, biên tập bản thảo",
    },
    viewer: {
      name: "Người xem",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      desc: "Đọc câu chuyện đã duyệt, hỏi đáp",
    },
    narrator: {
      name: "Người kể chuyện",
      badge: "bg-terracotta/10 text-terracotta border-terracotta/30",
      desc: "Duyệt nội dung do mình chia sẻ",
    },
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <span className="text-ink font-medium">Quản lý thành viên</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Thành Viên Kho Gia Đình</h1>
          <p className="text-sm text-ink-muted mt-1">
            Thiết lập quyền truy cập nghiêm ngặt: Mỗi người có một vai trò cụ thể để bảo vệ lời kể và ký ức.
          </p>
        </div>

        <div className="text-xs bg-white border border-stone-200 px-3 py-2 rounded-xl text-ink-muted">
          Vai trò của bạn: <strong className="text-ink">{roleMeta[currentMember.role].name}</strong>
        </div>
      </div>

      {invitations.length > 0 && (
        <section className="bg-white border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold">Mã mời đang chờ</h2>
          <p className="text-sm">Gửi mã riêng cho đúng người nhận. Họ nhập mã trong trang Kho gia đình sau khi đăng nhập.</p>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="space-y-1">
              <label htmlFor={`invite-${invitation.id}`} className="block text-xs">{invitation.email}</label>
              <input id={`invite-${invitation.id}`} readOnly value={invitation.token}
                className="w-full max-w-lg border rounded-lg px-2 py-1 font-mono text-sm" />
            </div>
          ))}
        </section>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách thành viên (Chiếm 2 cột) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg text-ink">Danh sách thành viên ({members.length})</h2>
              {!isAdmin && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  Chế độ chỉ đọc (Chỉ Quản trị viên mới được mời/sửa quyền)
                </span>
              )}
            </div>

            <div className="divide-y divide-stone-100">
              {members.map((member) => {
                const isSelf = member.user_id === currentUser.id;
                const isRevoked = member.status === "revoked";
                const meta = roleMeta[member.role];

                return (
                  <div
                    key={member.id}
                    className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isRevoked ? "opacity-50 bg-stone-50/50 px-3 rounded-xl" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{member.full_name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                            Chính bạn
                          </span>
                        )}
                        {isRevoked ? (
                          <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                            Đã thu hồi quyền
                          </span>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${meta.badge}`}>
                            {meta.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted">{member.email}</p>
                      <p className="text-[11px] text-stone-400">{meta.desc}</p>
                    </div>

                    {isAdmin && !isRevoked && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Form đổi vai trò */}
                        <form action={updateMemberRoleAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="workspace_id" value={workspace.id} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                          >
                            <option value="admin">Quản trị viên</option>
                            <option value="contributor">Người đóng góp</option>
                            <option value="viewer">Người xem</option>
                            <option value="narrator">Người kể chuyện</option>
                          </select>
                          <button
                            type="submit"
                            className="text-xs bg-stone-100 hover:bg-stone-200 text-ink px-2 py-1 rounded-lg font-medium transition-colors"
                          >
                            Lưu vai trò
                          </button>
                        </form>

                        {/* Form thu hồi quyền */}
                        <form action={revokeMemberAction}>
                          <input type="hidden" name="workspace_id" value={workspace.id} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <button
                            type="submit"
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                          >
                            Thu hồi
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nhật ký bảo mật (Audit Events) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="font-serif font-bold text-base text-ink">Nhật ký truy cập & phân quyền (Audit Log)</h2>
            <div className="divide-y divide-stone-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-ink">{log.action}</span>
                    <span className="text-stone-400 ml-2">({log.target_type})</span>
                  </div>
                  <span className="text-stone-400 text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Khung Mời Thành Viên (Chiếm 1 cột, chỉ Admin mới thấy form thao tác) */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-lg text-ink">Mời người thân vào kho</h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                Chỉ những người được mời mới có quyền truy cập vào kho tư liệu gia đình.
              </p>
            </div>

            {isAdmin ? (
              <form action={inviteMemberAction} className="space-y-4">
                <input type="hidden" name="workspace_id" value={workspace.id} />

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-ink">
                    Email người thân <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="nguoithan@giadinh.vn"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="role" className="block text-xs font-semibold text-ink">
                    Vai trò cấp quyền <span className="text-terracotta">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    defaultValue="contributor"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                  >
                    <option value="narrator">Người kể chuyện (Duyệt nội dung)</option>
                    <option value="contributor">Người đóng góp (Tải ảnh/thu âm)</option>
                    <option value="viewer">Người xem (Chỉ đọc & hỏi đáp)</option>
                    <option value="admin">Quản trị viên (Toàn quyền)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn w-full bg-forest hover:bg-forest-hover text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
                >
                  + Gửi lời mời tham gia
                </button>
              </form>
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-ink-muted">
                Bạn đang đăng nhập với vai trò <strong>{roleMeta[currentMember.role].name}</strong>. Chỉ Quản trị viên mới có quyền mời thành viên mới vào kho.
              </div>
            )}
          </div>

          {/* Hướng dẫn bảo mật */}
          <div className="bg-cream-100/70 border border-cream-200 rounded-2xl p-5 space-y-2 text-xs text-ink-muted">
            <h3 className="font-bold text-ink">
              Chính sách bảo mật & Quyền riêng tư
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mỗi kho gia đình là một không gian hoàn toàn riêng tư, biệt lập và được bảo vệ.</li>
              <li>Thành viên chỉ tiếp cận đúng nội dung được phân quyền trong gia đình.</li>
              <li>Khi thu hồi quyền thành viên, quyền truy cập sẽ bị đóng ngay lập tức.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
