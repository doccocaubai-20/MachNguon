import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { createEntityAction } from "../../actions";

interface CreateEntityPageProps {
  params: Promise<{ id: string }>;
}

export default async function CreateEntityPage({ params }: CreateEntityPageProps) {
  const { id: workspaceId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const { currentMember } = await wsService.getWorkspace(userId, workspaceId);

  if (!["admin", "contributor", "narrator"].includes(currentMember.role)) {
    redirect(`/workspaces/${workspaceId}/graph`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href={`/workspaces/${workspaceId}/graph`} className="hover:text-forest transition-colors">
          ← Bản đồ tri thức
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Thêm nút thực thể</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">Thêm Nút Tri Thức Mới</h1>
          <p className="text-xs text-ink-muted mt-1">
            Định danh một đối tượng trung tâm (Người, Địa điểm, Sự kiện, Kỹ năng) để kết nối vào mạng lưới.
          </p>
        </div>

        <form action={createEntityAction} className="space-y-6">
          <input type="hidden" name="workspace_id" value={workspaceId} />

          {/* Phân loại */}
          <div className="space-y-1.5">
            <label htmlFor="entity_type" className="block text-xs font-semibold text-ink">
              Phân loại đối tượng <span className="text-terracotta">*</span>
            </label>
            <select
              id="entity_type"
              name="entity_type"
              required
              defaultValue="skill"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
            >
              <option value="skill">Kỹ năng / Bí quyết gia truyền (Skill)</option>
              <option value="person">Người thân (Person)</option>
              <option value="place">Địa điểm / Di tích gia đình (Place)</option>
              <option value="event">Sự kiện / Kỷ niệm (Event)</option>
            </select>
          </div>

          {/* Tên nút */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-xs font-semibold text-ink">
              Tên đối tượng <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="VD: Kỹ năng ủ bột bánh xốp giòn, Ngõ Hàng Chiếu..."
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Biệt danh / Aliases */}
          <div className="space-y-1.5">
            <label htmlFor="aliases" className="block text-xs font-semibold text-ink">
              Tên gọi khác / Biệt danh (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              id="aliases"
              name="aliases"
              placeholder="VD: Pha bột bánh gối, Ủ bột vỏ sò"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-semibold text-ink">
              Mô tả chi tiết / Lời giải thích
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Ghi chú về ý nghĩa, nguồn gốc hoặc đặc điểm cốt lõi của nút này..."
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Link
              href={`/workspaces/${workspaceId}/graph`}
              className="btn px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="btn bg-forest hover:bg-forest-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Lưu nút tri thức
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
