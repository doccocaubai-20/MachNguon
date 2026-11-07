import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { ManualService } from "@/lib/server/manual.service";

interface ManualsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ManualsPage({ params }: ManualsPageProps) {
  const { id: workspaceId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const manualService = new ManualService(db);

  const [workspaceData, manuals] = await Promise.all([
    wsService.getWorkspace(userId, workspaceId),
    manualService.listManuals(userId, workspaceId),
  ]);

  const { workspace, currentMember } = workspaceData;

  const canCreate = ["admin", "contributor", "narrator"].includes(currentMember.role);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href={`/workspaces/${workspaceId}`} className="hover:text-forest transition-colors">
          ← Về kho {workspace.name}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Tủ kinh nghiệm</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
            Tủ Kinh Nghiệm Gia Đình
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Cẩm nang thực hành các món ăn, bí quyết và nghề truyền thống được ông bà, cha mẹ xác nhận.
          </p>
        </div>

        {canCreate && (
          <Link
            href={`/workspaces/${workspaceId}/manuals/create`}
            className="btn inline-flex items-center gap-2 bg-forest hover:bg-forest-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>+</span> Soạn cẩm nang mới
          </Link>
        )}
      </div>

      {/* Manuals Grid */}
      {manuals.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <h3 className="font-serif font-bold text-lg text-ink">Chưa có cẩm nang nào</h3>
          <p className="text-xs text-ink-muted">
            Tủ kinh nghiệm giúp con cháu dễ dàng làm theo các bài thuốc, món ăn gia truyền chuẩn vị với từng bước có mốc đối chiếu.
          </p>
          {canCreate && (
            <Link
              href={`/workspaces/${workspaceId}/manuals/create`}
              className="btn inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-forest-hover"
            >
              + Tạo cẩm nang đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {manuals.map((m) => {
            const isApproved = m.status === "approved";
            return (
              <div
                key={m.id}
                className="bg-white border border-stone-200 hover:border-forest/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Status & Skill Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        isApproved
                          ? "bg-forest/10 text-forest border-forest/20"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {isApproved ? "Đã phê duyệt" : "Chờ duyệt"}
                    </span>
                    <span className="text-[11px] text-ink-muted font-mono">
                      Phiên bản v{m.version_number}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="font-serif font-bold text-xl text-ink group-hover:text-forest transition-colors line-clamp-2">
                      {m.title}
                    </h3>
                    {m.skill_name && (
                      <div className="text-[11px] text-forest font-medium mt-1">
                        Kỹ năng: {m.skill_name}
                      </div>
                    )}
                    {m.summary && (
                      <p className="text-xs text-ink-muted mt-2 line-clamp-3 leading-relaxed">
                        {m.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="space-y-3 pt-4 border-t border-stone-100 text-xs">
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>
                      {m.ingredients?.length || 0} nguyên liệu & dụng cụ
                    </span>
                    <span>
                      {m.steps?.length || 0} bước thực hành
                    </span>
                  </div>

                  <Link
                    href={`/workspaces/${workspaceId}/manuals/${m.id}`}
                    className="btn w-full inline-flex items-center justify-center gap-1.5 bg-cream-100 group-hover:bg-forest text-ink group-hover:text-white py-2.5 rounded-xl font-medium transition-colors text-xs"
                  >
                    Mở cẩm nang thực hành →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
