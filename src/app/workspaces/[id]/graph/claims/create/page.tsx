import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { GraphService } from "@/lib/server/graph.service";
import { AssetService } from "@/lib/server/asset.service";
import { createClaimAction } from "../../actions";

interface CreateClaimPageProps {
  params: Promise<{ id: string }>;
}

export default async function CreateClaimPage({ params }: CreateClaimPageProps) {
  const { id: workspaceId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const graphService = new GraphService(db);
  const assetService = new AssetService(db);

  const { currentMember } = await wsService.getWorkspace(userId, workspaceId);

  if (!["admin", "contributor", "narrator"].includes(currentMember.role)) {
    redirect(`/workspaces/${workspaceId}/graph`);
  }

  const entities = await graphService.listEntities(userId, workspaceId);
  const assets = await assetService.listAssets(userId, workspaceId, { familyOnly: true });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href={`/workspaces/${workspaceId}/graph`} className="hover:text-forest transition-colors">
          ← Bản đồ tri thức
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Thêm liên kết tri thức</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">Thêm Liên Kết Có Nguồn</h1>
          <p className="text-xs text-ink-muted mt-1">
            Thiết lập mối quan hệ giữa hai nút tri thức kèm trích dẫn lời kể và mốc thời gian âm thanh đối chiếu.
          </p>
        </div>

        <form action={createClaimAction} className="space-y-6">
          <input type="hidden" name="workspace_id" value={workspaceId} />

          {/* Chọn nút nguồn & nút đích */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="source_entity_id" className="block text-xs font-semibold text-ink">
                Nút nguồn (Chủ thể) <span className="text-terracotta">*</span>
              </label>
              <select
                id="source_entity_id"
                name="source_entity_id"
                required
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
              >
                <option value="">-- Chọn nút nguồn --</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.entity_type}] {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="target_entity_id" className="block text-xs font-semibold text-ink">
                Nút đích (Đối tượng nhận) <span className="text-terracotta">*</span>
              </label>
              <select
                id="target_entity_id"
                name="target_entity_id"
                required
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
              >
                <option value="">-- Chọn nút đích --</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.entity_type}] {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loại quan hệ */}
          <div className="space-y-1.5">
            <label htmlFor="relation_type" className="block text-xs font-semibold text-ink">
              Mã loại quan hệ <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="relation_type"
              name="relation_type"
              required
              placeholder="VD: mastered, taught, sold_at, guided, created, located_at..."
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
            <p className="text-[11px] text-ink-muted">
              Gợi ý: <code>taught</code> (truyền dạy), <code>mastered</code> (nắm giữ bí quyết), <code>guided</code> (hướng dẫn), <code>sold_at</code> (từng bán tại), <code>created</code> (sáng tạo).
            </p>
          </div>

          {/* Lời khẳng định */}
          <div className="space-y-1.5">
            <label htmlFor="statement" className="block text-xs font-semibold text-ink">
              Lời khẳng định liên kết tự nhiên <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="statement"
              name="statement"
              required
              placeholder="VD: Bà Mai truyền dạy bí quyết căn lửa chảo dầu cho Bác An"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Tư liệu chứng minh gốc */}
          <div className="space-y-4 pt-3 border-t border-stone-100">
            <div className="space-y-1.5">
              <label htmlFor="evidence_asset_id" className="block text-xs font-semibold text-ink">
                Tư liệu chứng minh từ kho
              </label>
              <select
                id="evidence_asset_id"
                name="evidence_asset_id"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
              >
                <option value="">-- Không đính kèm / Chọn sau --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.asset_type}] {a.title || a.file_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Trích dẫn bằng chứng */}
            <div className="space-y-1.5">
              <label htmlFor="evidence_quote" className="block text-xs font-semibold text-ink">
                Đoạn trích dẫn bằng chứng (lời nói hoặc trích đoạn văn bản)
              </label>
              <textarea
                id="evidence_quote"
                name="evidence_quote"
                rows={3}
                placeholder="Trích dẫn chính xác lời người kể để đối chiếu..."
                className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
              />
            </div>

            {/* Mốc thời gian */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="start_time_seconds" className="block text-xs font-semibold text-ink">
                  Giây bắt đầu (nếu là audio)
                </label>
                <input
                  type="number"
                  id="start_time_seconds"
                  name="start_time_seconds"
                  min={0}
                  step="0.1"
                  placeholder="VD: 15"
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end_time_seconds" className="block text-xs font-semibold text-ink">
                  Giây kết thúc (nếu là audio)
                </label>
                <input
                  type="number"
                  id="end_time_seconds"
                  name="end_time_seconds"
                  min={0}
                  step="0.1"
                  placeholder="VD: 55"
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                />
              </div>
            </div>
          </div>

          {/* Trạng thái xác nhận ban đầu */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <label htmlFor="status" className="block text-xs font-semibold text-ink">
              Trạng thái xác nhận ban đầu
            </label>
            <select
              id="status"
              name="status"
              defaultValue="unverified"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
            >
              <option value="unverified">Chưa xác nhận (Unverified) - Cần đối chiếu</option>
              <option value="proposed">Đề xuất bởi AI / Thành viên (Proposed)</option>
              {currentMember.role === "admin" && (
                <option value="confirmed">Xác nhận ngay (Confirmed) - Quyền Admin</option>
              )}
            </select>
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
              Tạo liên kết có nguồn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
