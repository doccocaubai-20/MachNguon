import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { acceptInvitationAction, createWorkspaceAction } from "./actions";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const service = new WorkspaceService(db);

  const workspaces = await service.listUserWorkspaces(currentUser.id);

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: "Quản trị viên kho", color: "bg-forest/10 text-forest border-forest/20" },
    contributor: { label: "Người đóng góp", color: "bg-blue-50 text-blue-700 border-blue-200" },
    viewer: { label: "Người xem", color: "bg-amber-50 text-amber-700 border-amber-200" },
    narrator: { label: "Người kể chuyện", color: "bg-terracotta/10 text-terracotta border-terracotta/20" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Kho Gia Đình Của Bạn</h1>
          <p className="text-sm text-ink-muted mt-1">
            Mỗi kho là một không gian biệt lập, bảo vệ quyền riêng tư và ký ức của gia đình bạn.
          </p>
        </div>

        <div className="text-xs bg-white border border-stone-200 px-3 py-2 rounded-xl text-ink-muted">
          Đăng nhập: <strong className="text-ink">{currentUser.fullName}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách Kho (Chiếm 2 cột) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif font-bold text-lg text-ink">Danh sách kho tham gia ({workspaces.length})</h2>

          {workspaces.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4">
              <h3 className="font-serif font-bold text-lg text-ink">Chưa có kho gia đình nào</h3>
              <p className="text-sm text-ink-muted max-w-md mx-auto">
                Tài khoản này hiện chưa tham gia kho gia đình nào. Bạn có thể tự tạo kho đầu tiên ở khung bên cạnh
                hoặc nhờ người quản trị kho gửi lời mời tham gia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {workspaces.map((ws) => {
                const roleBadge = roleLabels[ws.role] || {
                  label: ws.role,
                  color: "bg-stone-100 text-stone-700 border-stone-200",
                };

                return (
                  <div
                    key={ws.id}
                    className="bg-white border border-stone-200 hover:border-forest/40 rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif font-bold text-xl text-ink">{ws.name}</h3>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted line-clamp-2">
                        {ws.description || "Chưa có mô tả kho."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs">
                      <span className="text-ink-muted">Mã kho: {ws.id.substring(0, 8)}...</span>
                      <Link
                        href={`/workspaces/${ws.id}`}
                        className="btn inline-flex items-center gap-1 bg-forest hover:bg-forest-hover text-white px-4 py-2 rounded-xl font-medium transition-colors"
                      >
                        Mở kho gia đình →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Khung Tạo Kho Mới (Chiếm 1 cột) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm h-fit space-y-4">
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-lg text-ink">Tạo kho gia đình mới</h2>
            <p className="text-xs text-ink-muted">
              Bạn sẽ tự động là Quản trị viên (Admin) của kho này và có quyền mời các thành viên khác.
            </p>
          </div>

          <form action={createWorkspaceAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold text-ink">
                Tên kho gia đình <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="VD: Gia đình họ Lê - Hà Nội"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-xs font-semibold text-ink">
                Lời giới thiệu / Mục đích kho
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Lưu giữ các kỷ niệm, lời kể và bài học kinh nghiệm của ông bà..."
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
              />
            </div>

            <button
              type="submit"
              className="btn w-full bg-forest hover:bg-forest-hover text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
            >
              + Tạo kho gia đình
            </button>
          </form>
          <form action={acceptInvitationAction} className="space-y-3 border-t border-stone-100 pt-4">
            <div className="space-y-1">
              <label htmlFor="invite-code" className="block text-xs font-semibold text-ink">
                Tham gia kho bằng mã lời mời
              </label>
              <input
                id="invite-code"
                name="token"
                required
                maxLength={104}
                autoComplete="off"
                placeholder="Dán mã mời nhận được từ người thân..."
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-forest"
              />
            </div>
            {invite === "invalid" && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 p-2 rounded-xl border border-red-200">
                Mã lời mời không hợp lệ, đã hết hạn, đã được sử dụng hoặc không dành cho tài khoản của bạn.
              </p>
            )}
            <button
              type="submit"
              className="btn w-full bg-cream-100 hover:bg-cream-200 text-forest border border-cream-200 font-semibold py-2 px-3 rounded-xl text-xs transition-colors"
            >
              Chấp nhận lời mời vào kho
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
