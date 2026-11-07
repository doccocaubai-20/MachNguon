import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { AssetService } from "@/lib/server/asset.service";
import { createStoryAction } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreateStoryPage({ params }: Props) {
  const { id: workspaceId } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const personService = new PersonService(db);
  const assetService = new AssetService(db);

  const { workspace } = await wsService.getWorkspace(currentUser.id, workspaceId);
  const persons = await personService.listPersons(currentUser.id, workspaceId);
  const audios = await assetService.listAssets(currentUser.id, workspaceId, { assetType: "audio", familyOnly: true });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}/stories`} className="hover:text-forest">Câu chuyện có nguồn</Link>
        <span>/</span>
        <span className="text-ink font-medium">Biên soạn mới</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">Biên Soạn Câu Chuyện Có Nguồn</h1>
          <p className="text-xs text-ink-muted mt-1">
            Gắn kết văn bản biên tập với lời kể âm thanh gốc để người kể dễ dàng kiểm tra và phê duyệt.
          </p>
        </div>

        <form action={createStoryAction} className="space-y-4">
          <input type="hidden" name="workspace_id" value={workspace.id} />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Tiêu đề câu chuyện <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="VD: Ký ức về gánh bánh gối phố cổ của bà..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Người kể chuyện
              </label>
              <select
                name="narrator_id"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="">-- Chưa chọn người kể --</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} {p.nick_name ? `(${p.nick_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Bản ghi âm nguồn gốc (P03)
              </label>
              <select
                name="primary_asset_id"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="">-- Chọn file ghi âm để đối soát --</option>
                {audios.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({Math.floor((a.duration_seconds || 0) / 60)} phút)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Chủ đề phân loại</label>
            <input
              type="text"
              name="category"
              defaultValue="ẩm thực & gia đình"
              placeholder="VD: ẩm thực, thời bao cấp, tuổi thơ..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Tóm tắt ngắn gọn</label>
            <textarea
              name="summary"
              rows={2}
              placeholder="Tóm tắt bối cảnh và ý nghĩa câu chuyện..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Nội dung câu chuyện biên tập <span className="text-terracotta">*</span>
            </label>
            <textarea
              name="content"
              required
              rows={8}
              placeholder="Viết nội dung câu chuyện đã biên tập dựa trên lời kể..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest leading-relaxed font-serif"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              href={`/workspaces/${workspace.id}/stories`}
              className="btn px-4 py-2 text-xs text-stone-500 hover:bg-stone-100 rounded-xl"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="btn px-6 py-2.5 bg-forest hover:bg-forest-hover text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
            >
              Lưu bản nháp & gửi người kể duyệt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
