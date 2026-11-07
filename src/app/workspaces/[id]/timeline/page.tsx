import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { TimelineService } from "@/lib/server/timeline.service";
import { deleteTimelineEventAction, updateTimelineEventAction } from "./actions";
import { hasPermission } from "@/lib/server/permissions";

interface TimelinePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    person_id?: string;
    importance?: "normal" | "milestone" | "major";
    query?: string;
  }>;
}

export default async function TimelinePage({ params, searchParams }: TimelinePageProps) {
  const { id: workspaceId } = await params;
  const sParams = await searchParams;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const personService = new PersonService(db);
  const timelineService = new TimelineService(db);

  const filters = {
    person_id: sParams.person_id || undefined,
    importance: sParams.importance || undefined,
    query: sParams.query || undefined,
  };

  const [workspaceData, persons, events] = await Promise.all([
    wsService.getWorkspace(userId, workspaceId),
    personService.listPersons(userId, workspaceId),
    timelineService.listEvents(userId, workspaceId, filters),
  ]);

  const { workspace, currentMember } = workspaceData;
  const canCreate = ["admin", "contributor", "narrator"].includes(currentMember.role);

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-2">
            <Link href={`/workspaces/${workspaceId}`} className="hover:text-forest transition-colors">
              ← Về kho {workspace.name}
            </Link>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
              Dòng Thời Gian Gia Đình
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Các sự kiện, cột mốc ký ức gắn với người thân và tư liệu gốc qua nhiều thế hệ.
            </p>
          </div>
        </div>

        {canCreate && (
          <Link
            href={`/workspaces/${workspaceId}/timeline/create`}
            className="btn inline-flex items-center gap-2 bg-forest hover:bg-forest-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>+</span> Thêm sự kiện mới
          </Link>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form method="GET" className="flex flex-wrap items-center gap-3 flex-1">
          {/* Lọc theo người */}
          <div className="flex items-center gap-2">
            <label htmlFor="person_id" className="text-xs font-semibold text-ink-muted">
              Nhân vật:
            </label>
            <select
              id="person_id"
              name="person_id"
              defaultValue={filters.person_id || ""}
              className="bg-cream-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
            >
              <option value="">Tất cả người thân</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.nick_name ? `(${p.nick_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo mức độ quan trọng */}
          <div className="flex items-center gap-2">
            <label htmlFor="importance" className="text-xs font-semibold text-ink-muted">
              Mức độ:
            </label>
            <select
              id="importance"
              name="importance"
              defaultValue={filters.importance || ""}
              className="bg-cream-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
            >
              <option value="">Tất cả sự kiện</option>
              <option value="milestone">Chỉ xem cột mốc quan trọng</option>
              <option value="major">Sự kiện trọng đại</option>
              <option value="normal">Kỷ niệm thường nhật</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-forest text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-forest-hover transition-colors"
          >
            Lọc dòng thời gian
          </button>

          {(filters.person_id || filters.importance || filters.query) && (
            <Link
              href={`/workspaces/${workspaceId}/timeline`}
              className="text-xs text-ink-muted hover:text-terracotta underline"
            >
              Xóa bộ lọc
            </Link>
          )}
        </form>

        <div className="text-xs text-ink-muted">
          Tổng cộng: <strong className="text-ink">{events.length}</strong> sự kiện
        </div>
      </div>

      {/* Timeline Stream */}
      {events.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <h3 className="font-serif font-bold text-lg text-ink">Chưa có sự kiện nào</h3>
          <p className="text-xs text-ink-muted mt-1 mb-6">
            Hãy bắt đầu ghi lại những mốc thời gian đáng nhớ đầu tiên của ông bà, cha mẹ hoặc đại gia đình.
          </p>
          {canCreate && (
            <Link
              href={`/workspaces/${workspaceId}/timeline/create`}
              className="btn inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-forest-hover"
            >
              + Tạo sự kiện mốc thời gian đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:inset-0 before:left-3 sm:before:left-5 before:w-0.5 before:bg-forest/20">
          {events.map((event) => {
            const isMilestone = event.importance === "milestone" || event.importance === "major";

            return (
              <div key={event.id} className="relative group">
                {/* Year / Milestone Badge on Timeline Axis */}
                <div
                  className={`absolute -left-6 sm:-left-10 w-6 sm:w-10 h-6 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-110 ${
                    isMilestone
                      ? "bg-terracotta text-white ring-4 ring-terracotta/20"
                      : "bg-forest text-white ring-4 ring-forest/20"
                  }`}
                >
                  <span className={isMilestone ? "w-2.5 h-2.5 rounded-full bg-white block" : "w-1.5 h-1.5 rounded-full bg-white block"} />
                </div>

                {/* Event Card */}
                <div className="bg-white border border-stone-200 hover:border-forest/40 rounded-2xl p-6 shadow-sm transition-all ml-2 sm:ml-4 space-y-4">
                  {/* Top Bar: Year & Date & Importance */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-serif font-bold text-xl sm:text-2xl text-ink tracking-tight">
                        {event.year_end != null ? `${event.year}–${event.year_end}` : event.year}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-100 text-ink-muted font-medium border border-cream-200">
                        {event.date_display}
                      </span>
                      {isMilestone && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-terracotta/10 text-terracotta font-medium border border-terracotta/20">
                          Cột mốc quan trọng
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {(currentMember.role === "admin" || event.created_by === userId) && (
                        <form action={deleteTimelineEventAction}>
                          <input type="hidden" name="workspace_id" value={workspaceId} />
                          <input type="hidden" name="event_id" value={event.id} />
                          <button
                            type="submit"
                            className="text-xs text-stone-400 hover:text-red-600 transition-colors"
                            title="Xóa sự kiện này"
                          >
                            Xóa
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {hasPermission(currentMember.role, "timeline:edit") &&
                    (currentMember.role === "admin" || event.created_by === userId) && (
                    <details className="border rounded-xl p-3">
                      <summary className="cursor-pointer text-sm font-semibold">Sửa sự kiện</summary>
                      <form action={updateTimelineEventAction} className="mt-2 grid gap-2 text-sm">
                        <input type="hidden" name="workspace_id" value={workspaceId} />
                        <input type="hidden" name="event_id" value={event.id} />
                        <label className="grid">Tên sự kiện
                          <input name="title" required defaultValue={event.title} className="border rounded p-1" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid">Năm bắt đầu
                            <input type="number" name="year" required min={1000} max={2100} defaultValue={event.year} className="border rounded p-1" />
                          </label>
                          <label className="grid">Năm kết thúc
                            <input type="number" name="year_end" min={1000} max={2100} defaultValue={event.year_end ?? ""} className="border rounded p-1" />
                          </label>
                        </div>
                        <label className="grid">Ngày hiển thị
                          <input name="date_display" required defaultValue={event.date_display} className="border rounded p-1" />
                        </label>
                        <label className="grid">Ghi chú
                          <textarea name="description" defaultValue={event.description ?? ""} className="border rounded p-1" />
                        </label>
                        <button className="w-fit bg-forest text-white px-3 py-1.5 rounded">Lưu sự kiện</button>
                      </form>
                    </details>
                  )}

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-ink">
                      {event.title}
                    </h3>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-ink-muted">
                        <span className="font-semibold text-stone-500">Địa điểm:</span>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line pt-1">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Associated Persons */}
                  {event.persons && event.persons.length > 0 && (
                    <div className="pt-2 border-t border-stone-50">
                      <div className="text-xs font-semibold text-ink-muted mb-2">
                        Người thân liên quan:
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {event.persons.map((p) => (
                          <Link
                            key={p.person_id}
                            href={`/workspaces/${workspaceId}/persons/${p.person_id}`}
                            className="inline-flex items-center gap-1.5 bg-cream-100/70 hover:bg-forest/10 border border-stone-200 hover:border-forest/30 rounded-xl px-2.5 py-1 text-xs text-ink transition-colors"
                          >
                            <span className="w-5 h-5 rounded-full bg-forest text-cream-50 flex items-center justify-center font-bold text-[10px]">
                              {p.full_name?.charAt(0) || "N"}
                            </span>
                            <span className="font-medium">{p.full_name}</span>
                            {p.nick_name && (
                              <span className="text-ink-muted text-[11px]">({p.nick_name})</span>
                            )}
                            {p.role_description && (
                              <span className="text-forest text-[11px] font-medium ml-1">
                                • {p.role_description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Associated Assets (Evidence & Media) */}
                  {event.assets && event.assets.length > 0 && (
                    <div className="pt-2 border-t border-stone-50">
                      <div className="text-xs font-semibold text-ink-muted mb-2">
                        Tư liệu chứng minh ({event.assets.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {event.assets.map((a) => (
                          <div
                            key={a.asset_id}
                            className="bg-cream-50/60 border border-stone-200 rounded-xl p-3 flex items-start gap-3 text-xs"
                          >
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-cream-100 text-forest border border-cream-200 shrink-0">
                              {a.asset_type === "audio"
                                ? "Audio"
                                : a.asset_type === "image"
                                ? "Ảnh"
                                : "Tài liệu"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-ink truncate">
                                {a.title || a.file_name}
                              </div>
                              {a.caption && (
                                <p className="text-[11px] text-ink-muted italic mt-0.5">
                                  &ldquo;{a.caption}&rdquo;
                                </p>
                              )}
                              <div className="mt-1">
                                <Link
                                  href={`/workspaces/${workspaceId}/assets`}
                                  className="text-[11px] text-forest hover:underline font-medium"
                                >
                                  Mở trong kho tư liệu →
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
