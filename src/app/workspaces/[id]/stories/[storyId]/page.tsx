import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { StoryService } from "@/lib/server/story.service";
import { hasPermission } from "@/lib/server/permissions";
import { StoryEvidencePlayer } from "@/components/StoryEvidencePlayer";
import { approveStoryAction, addEvidenceAction, appendTranscriptAction, updateStoryAction } from "../actions";
import { StoryStatus } from "@/contracts/story.contract";

interface Props {
  params: Promise<{ id: string; storyId: string }>;
}

export default async function StoryDetailPage({ params }: Props) {
  const { id: workspaceId, storyId } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const storyService = new StoryService(db);

  let workspaceData;
  try {
    workspaceData = await wsService.getWorkspace(currentUser.id, workspaceId);
  } catch (err: any) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">Bạn không có quyền truy cập câu chuyện trong kho gia đình này.</p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const canApprove = hasPermission(currentMember.role, "story:approve");
  const canPropose = hasPermission(currentMember.role, "story:propose");

  let story;
  try {
    story = await storyService.getStory(currentUser.id, workspaceId, storyId);
  } catch (err: any) {
    notFound();
  }

  // Lấy các đoạn gỡ băng âm thanh (nếu có audio gắn liền)
  const transcriptSegments = story.primary_asset_id
    ? await storyService.getTranscript(currentUser.id, workspaceId, story.primary_asset_id)
    : [];

  const statusMeta: Record<StoryStatus, { label: string; badge: string; desc: string }> = {
    approved: {
      label: "Đã phê duyệt",
      badge: "bg-forest/10 text-forest border-forest/30",
      desc: "Nội dung đã được người kể chuyện trực tiếp xác nhận độ chính xác.",
    },
    pending_approval: {
      label: "Chờ người kể duyệt",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      desc: "Bản biên tập đang chờ người kể (hoặc người đại diện) đối soát trước khi công bố.",
    },
    draft: {
      label: "Bản nháp",
      badge: "bg-stone-100 text-stone-600 border-stone-200",
      desc: "Bản nháp đang trong quá trình ghi chép và chỉnh sửa.",
    },
    rejected: {
      label: "Cần chỉnh sửa",
      badge: "bg-red-50 text-red-700 border-red-200",
      desc: "Người kể đã yêu cầu xem xét lại một số chi tiết chưa chính xác.",
    },
  };

  const status = statusMeta[story.status];

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}/stories`} className="hover:text-forest">Câu chuyện có nguồn</Link>
        <span>/</span>
        <span className="text-ink font-medium">{story.title}</span>
      </div>

      {/* Approval Banner */}
      {story.status === "pending_approval" && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <strong className="text-xs text-amber-900 uppercase tracking-wider">
              Câu chuyện đang chờ phê duyệt
            </strong>
            <p className="text-xs text-amber-800">
              {status.desc}
            </p>
          </div>

          {canApprove && (
            <form action={approveStoryAction}>
              <input type="hidden" name="workspace_id" value={workspace.id} />
              <input type="hidden" name="story_id" value={story.id} />
              <button
                type="submit"
                className="btn px-4 py-2 bg-forest hover:bg-forest-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
              >
                Xác nhận duyệt câu chuyện này
              </button>
            </form>
          )}
        </div>
      )}

      {story.status === "approved" && (
        <div className="p-4 rounded-2xl bg-forest/10 border border-forest/20 flex items-center justify-between text-xs text-forest">
          <span className="font-semibold">Bản chuẩn đã được người kể duyệt chính thức (Phiên bản v{story.version_number})</span>
          <span className="text-[11px] text-ink-muted">
            {story.approved_at && new Date(story.approved_at).toLocaleDateString("vi-VN")}
          </span>
        </div>
      )}

      {hasPermission(currentMember.role, "story:edit") &&
        (story.created_by === currentUser.id || currentMember.role === "admin") && (
        <details className="rounded-2xl border bg-white p-4">
          <summary className="cursor-pointer font-semibold">Chỉnh sửa câu chuyện</summary>
          <form action={updateStoryAction} className="mt-3 grid gap-2">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <input type="hidden" name="story_id" value={story.id} />
            <label className="grid gap-1">Tiêu đề
              <input name="title" required maxLength={200} defaultValue={story.title} className="border rounded-lg p-2" />
            </label>
            <label className="grid gap-1">Nội dung
              <textarea name="content" required minLength={10} rows={5} defaultValue={story.content} className="border rounded-lg p-2" />
            </label>
            <button className="btn rounded-lg bg-forest px-3 py-2 text-white w-fit">Lưu bản chỉnh sửa</button>
          </form>
        </details>
      )}

      {canPropose && story.created_by === currentUser.id && story.primary_asset_id && story.status !== "approved" && (
        <details className="rounded-2xl border bg-white p-4">
          <summary className="cursor-pointer font-semibold">Nhập bản chép lời theo mốc thời gian</summary>
          <form action={appendTranscriptAction} className="mt-3 grid gap-2">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <input type="hidden" name="story_id" value={story.id} />
            <label>Bắt đầu (giây) <input type="number" step="0.01" min="0" name="start" required className="border rounded px-2" /></label>
            <label>Kết thúc (giây) <input type="number" step="0.01" min="0" name="end" required className="border rounded px-2" /></label>
            <label className="grid gap-1">Lời kể nguyên văn
              <textarea name="text" rows={3} required maxLength={4000} className="border rounded-lg p-2" />
            </label>
            <button className="btn rounded-lg bg-forest px-3 py-2 text-white w-fit">Lưu đoạn chép lời</button>
          </form>
        </details>
      )}

      {/* Header Info */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider font-semibold bg-cream-100 text-forest px-3 py-1 rounded-lg">
            {story.category}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink leading-tight">
          {story.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pt-2 border-t border-stone-100">
          {story.narrator_name && (
            <span>Người kể: <strong className="text-ink">{story.narrator_name}</strong></span>
          )}
          <span>•</span>
          <span>Biên tập: {story.author_name}</span>
          <span>•</span>
          <span>Cập nhật: {new Date(story.updated_at).toLocaleDateString("vi-VN")}</span>
        </div>

        {story.summary && (
          <div className="p-4 rounded-xl bg-cream-50/70 border-l-4 border-forest text-xs text-ink-muted italic leading-relaxed">
            {story.summary}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột Trái: Văn bản Biên tập (Chiếm 7 cột) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="font-serif font-bold text-lg text-ink">Bản biên tập câu chuyện</h2>

            <div className="prose prose-stone max-w-none text-ink text-sm sm:text-base leading-relaxed font-serif whitespace-pre-line">
              {story.content}
            </div>
          </div>

          {/* Form gắn thêm trích dẫn bằng chứng */}
          {canPropose && story.status !== "approved" && story.primary_asset_id &&
            (story.created_by === currentUser.id || currentMember.role === "admin") && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-ink">
                + Thêm đoạn trích dẫn âm thanh gốc làm bằng chứng
              </h3>
              <form action={addEvidenceAction} className="space-y-3">
                <input type="hidden" name="workspace_id" value={workspace.id} />
                <input type="hidden" name="story_id" value={story.id} />
                <input type="hidden" name="asset_id" value={story.primary_asset_id} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink">Mốc thời gian (giây)</label>
                    <input
                      type="number"
                      name="start_time_seconds"
                      placeholder="VD: 45"
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-cream-50/50"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-ink">Lời nói gốc của người kể</label>
                    <input
                      type="text"
                      name="quote_text"
                      required
                      placeholder="Trích dẫn nguyên văn lời của bà..."
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-cream-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn px-4 py-2 bg-stone-100 hover:bg-stone-200 text-ink text-xs font-semibold rounded-xl transition-colors"
                >
                  Lưu trích dẫn bằng chứng
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Cột Phải: Trình phát Bằng chứng & Gỡ băng gốc (Chiếm 5 cột) */}
        <div className="lg:col-span-5 space-y-6">
          <StoryEvidencePlayer
            audioPath={story.primary_asset_path || null}
            audioTitle={story.primary_asset_title}
            evidenceRefs={story.evidence_refs}
            transcriptSegments={transcriptSegments}
          />
        </div>
      </div>
    </div>
  );
}
