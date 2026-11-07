import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { hasPermission } from "@/lib/server/permissions";
import { createPersonAction } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PersonsListPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const personService = new PersonService(db);

  let workspaceData;
  try {
    workspaceData = await wsService.getWorkspace(currentUser.id, id);
  } catch (err: any) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">Bạn không có quyền truy cập hồ sơ trong kho gia đình này.</p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const canEdit = hasPermission(currentMember.role, "story:propose");

  const persons = await personService.listPersons(currentUser.id, id);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <span className="text-ink font-medium">Hồ sơ người thân</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Hồ Sơ Người Thân</h1>
          <p className="text-sm text-ink-muted mt-1">
            Lưu giữ nhân thân, vai vế họ hàng, liên kết câu chuyện và kỹ năng truyền dạy qua các thế hệ.
          </p>
        </div>

        <div className="text-xs bg-white border border-stone-200 px-3 py-2 rounded-xl text-ink-muted">
          Tổng số người thân: <strong className="text-forest text-sm">{persons.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách người thân (Chiếm 2 cột) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif font-bold text-lg text-ink">Danh sách thành viên trong gia đình</h2>

          {persons.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
              <h3 className="font-serif font-bold text-base text-ink">Chưa có hồ sơ người thân nào</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Hãy bắt đầu tạo hồ sơ đầu tiên (ví dụ: ông bà hoặc người kể chuyện chính trong gia đình).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {persons.map((person) => (
                <Link
                  key={person.id}
                  href={`/workspaces/${workspace.id}/persons/${person.id}`}
                  className="bg-white border border-stone-200 hover:border-forest hover:shadow-sm rounded-2xl p-5 transition-all block space-y-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-cream-100 border border-stone-200 flex items-center justify-center font-serif font-bold text-base text-forest shrink-0">
                      {person.full_name.charAt(0)}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <h3 className="font-serif font-bold text-base text-ink group-hover:text-forest transition-colors truncate">
                        {person.full_name}
                      </h3>
                      {person.nick_name && (
                        <p className="text-xs text-terracotta font-medium">({person.nick_name})</p>
                      )}
                      <p className="text-xs text-ink-muted">
                        {person.birth_date ? `Năm sinh: ${person.birth_date}` : "Chưa rõ năm sinh"}
                      </p>
                    </div>
                  </div>

                  {person.bio && (
                    <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                      {person.bio}
                    </p>
                  )}

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-forest font-medium">
                    <span>Xem hồ sơ & quan hệ</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Form Thêm Người Thân Mới (Chiếm 1 cột) */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-lg text-ink">Thêm người thân</h2>
              <p className="text-xs text-ink-muted">
                Hệ thống bảo vệ danh tính: Hai người trùng tên sẽ được phân biệt bằng mã định danh riêng biệt.
              </p>
            </div>

            {canEdit ? (
              <form action={createPersonAction} className="space-y-4">
                <input type="hidden" name="workspace_id" value={workspace.id} />

                <div className="space-y-1.5">
                  <label htmlFor="full_name" className="block text-xs font-semibold text-ink">
                    Họ và tên <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    placeholder="VD: Bà Lê Thị Mai"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="nick_name" className="block text-xs font-semibold text-ink">
                    Tên thường gọi / Bậc vai vế
                  </label>
                  <input
                    type="text"
                    id="nick_name"
                    name="nick_name"
                    placeholder="VD: Bà Nội, Bác Cả, Chú Ba"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="gender" className="block text-xs font-semibold text-ink">
                      Giới tính
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      defaultValue="female"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                    >
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="birth_date" className="block text-xs font-semibold text-ink">
                      Năm sinh (hoặc khoảng năm)
                    </label>
                    <input
                      type="text"
                      id="birth_date"
                      name="birth_date"
                      placeholder="VD: 1936, Khoảng 1935-1940"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bio" className="block text-xs font-semibold text-ink">
                    Giới thiệu tóm tắt / Kỷ niệm đáng nhớ
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    placeholder="Quê quán, nghề nghiệp, món ăn hoặc kinh nghiệm sở trường..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                  />
                </div>

                <button
                  type="submit"
                  className="btn w-full bg-forest hover:bg-forest-hover text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
                >
                  + Thêm hồ sơ người thân
                </button>
              </form>
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-ink-muted">
                Bạn đang ở vai trò Người xem (chỉ đọc). Chỉ Quản trị viên hoặc Người đóng góp mới có quyền thêm hồ sơ.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
