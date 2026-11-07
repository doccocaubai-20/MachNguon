import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { AssetService } from "@/lib/server/asset.service";
import { createTimelineEventAction } from "../actions";

interface CreateTimelineEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function CreateTimelineEventPage({ params }: CreateTimelineEventPageProps) {
  const { id: workspaceId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const personService = new PersonService(db);
  const assetService = new AssetService(db);

  const { workspace, currentMember } = await wsService.getWorkspace(userId, workspaceId);

  // Kiểm tra quyền
  if (!["admin", "contributor", "narrator"].includes(currentMember.role)) {
    redirect(`/workspaces/${workspaceId}/timeline`);
  }

  const persons = await personService.listPersons(userId, workspaceId);
  const assets = await assetService.listAssets(userId, workspaceId, { familyOnly: true });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link
          href={`/workspaces/${workspaceId}/timeline`}
          className="hover:text-forest transition-colors"
        >
          ← Dòng thời gian
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Thêm sự kiện mốc thời gian</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">
            Ghi Lại Sự Kiện Dòng Thời Gian
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Gắn kết một kỷ niệm hoặc cột mốc của gia đình với năm tháng, người thân và tư liệu chứng minh.
          </p>
        </div>

        <form action={createTimelineEventAction} className="space-y-6">
          <input type="hidden" name="workspace_id" value={workspaceId} />

          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-semibold text-ink">
              Tiêu đề sự kiện / cột mốc <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              placeholder="VD: Bà bắt đầu gánh hàng bánh gối ở phố cổ Hà Nội"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Hàng 2: Năm & Ngày hiển thị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="year" className="block text-xs font-semibold text-ink">
                Năm diễn ra (dùng để sắp thứ tự) <span className="text-terracotta">*</span>
              </label>
              <input
                type="number"
                id="year"
                name="year"
                required
                min={1800}
                max={2100}
                defaultValue={new Date().getFullYear()}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="date_display" className="block text-xs font-semibold text-ink">
                Nhãn ngày hiển thị mềm dẻo <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                id="date_display"
                name="date_display"
                required
                placeholder="VD: Mùa thu năm 1965, Khoảng 1980, 15/08/1995"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
              />
            </div>
          </div>

          <label className="block text-sm">Năm kết thúc (nếu kéo dài nhiều năm)
            <input type="number" name="year_end" min={1000} max={2100} className="block border rounded-lg p-2" />
          </label>
          {/* Hàng 3: Độ chính xác & Mức độ quan trọng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="date_precision" className="block text-xs font-semibold text-ink">
                Độ chính xác ngày
              </label>
              <select
                id="date_precision"
                name="date_precision"
                defaultValue="approximate"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
              >
                <option value="approximate">Ước chừng / Gần đúng</option>
                <option value="decade">Khoảng thập kỷ</option>
                <option value="year">Chính xác năm</option>
                <option value="month">Chính xác tháng/năm</option>
                <option value="exact">Chính xác ngày/tháng/năm</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="importance" className="block text-xs font-semibold text-ink">
                Mức độ cột mốc
              </label>
              <select
                id="importance"
                name="importance"
                defaultValue="normal"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 cursor-pointer"
              >
                <option value="normal">Kỷ niệm thường nhật</option>
                <option value="milestone">Cột mốc quan trọng (Milestone)</option>
                <option value="major">Sự kiện trọng đại gia đình</option>
              </select>
            </div>
          </div>

          {/* Địa điểm */}
          <div className="space-y-1.5">
            <label htmlFor="location" className="block text-xs font-semibold text-ink">
              Địa điểm diễn ra
            </label>
            <input
              type="text"
              id="location"
              name="location"
              placeholder="VD: Ngõ Hàng Chiếu - chợ Đồng Xuân, Hà Nội"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Mô tả chi tiết */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-semibold text-ink">
              Nội dung câu chuyện / Mô tả sự kiện
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Kể lại bối cảnh, cảm xúc hoặc ý nghĩa của sự kiện này với người thân trong gia đình..."
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Gắn người thân */}
          {persons.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="block text-xs font-semibold text-ink">
                Người thân tham gia / gắn liền với sự kiện:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-cream-50/50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                {persons.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs text-ink cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="person_ids"
                      value={p.id}
                      className="rounded border-stone-300 text-forest focus:ring-forest w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">{p.full_name}</span>
                    {p.nick_name && (
                      <span className="text-ink-muted text-[11px]">({p.nick_name})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Gắn tư liệu chứng minh */}
          {assets.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="block text-xs font-semibold text-ink">
                Tư liệu chứng minh từ kho ({assets.length} tư liệu sẵn có):
              </label>
              <div className="grid grid-cols-1 gap-2 bg-cream-50/50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                {assets.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2.5 text-xs text-ink cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="asset_ids"
                      value={a.id}
                      className="rounded border-stone-300 text-forest focus:ring-forest w-4 h-4 cursor-pointer"
                    />
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-cream-100 text-forest border border-cream-200">
                      {a.asset_type === "audio" ? "Audio" : a.asset_type === "image" ? "Ảnh" : "Tài liệu"}
                    </span>
                    <span className="font-medium truncate">{a.title || a.file_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Nút thao tác */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Link
              href={`/workspaces/${workspaceId}/timeline`}
              className="btn px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="btn bg-forest hover:bg-forest-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Lưu sự kiện vào dòng thời gian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
