import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { ManualService } from "@/lib/server/manual.service";
import { AssetService } from "@/lib/server/asset.service";
import {
  approveManualAction,
  deleteManualAction,
  addPracticeNoteAction,
  answerPracticeNoteAction,
} from "../actions";

interface ManualDetailPageProps {
  params: Promise<{ id: string; manualId: string }>;
}

export default async function ManualDetailPage({ params }: ManualDetailPageProps) {
  const { id: workspaceId, manualId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const manualService = new ManualService(db);

  const { workspace, currentMember } = await wsService.getWorkspace(userId, workspaceId);
  const manual = await manualService.getManual(userId, workspaceId, manualId);

  if (!manual) {
    notFound();
  }

  const sources = manual.steps.some((step) => step.evidence_asset_id)
    ? await new AssetService(db).listAssets(userId, workspaceId, { familyOnly: true })
    : [];
  const sourcesById = new Map(sources.filter((asset) => asset.status === "ready").map((asset) => [asset.id, asset]));
  const isApproved = manual.status === "approved";
  const canApprove = ["admin", "narrator"].includes(currentMember.role) && !isApproved;
  const canAnswer = ["admin", "narrator"].includes(currentMember.role);
  const canDelete = currentMember.role === "admin" || manual.created_by === userId;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <div className="flex items-center gap-2">
          <Link
            href={`/workspaces/${workspaceId}/manuals`}
            className="hover:text-forest transition-colors"
          >
            ← Tủ kinh nghiệm
          </Link>
          <span>/</span>
          <span className="text-ink font-medium truncate max-w-xs">{manual.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {canDelete && (
            <form action={deleteManualAction}>
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <input type="hidden" name="manual_id" value={manual.id} />
              <button
                type="submit"
                className="text-stone-400 hover:text-red-600 transition-colors text-xs"
              >
                Xóa cẩm nang
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Manual Header Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                isApproved
                  ? "bg-forest/10 text-forest border-forest/20"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }`}
            >
              {isApproved ? "Đã được gia đình phê duyệt" : "Đang chờ phê duyệt"}
            </span>
            <span className="text-xs text-ink-muted font-mono bg-cream-100 px-2.5 py-0.5 rounded-full">
              Phiên bản v{manual.version_number}
            </span>
          </div>

          {canApprove && (
            <form action={approveManualAction}>
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <input type="hidden" name="manual_id" value={manual.id} />
              <button
                type="submit"
                className="btn bg-forest hover:bg-forest-hover text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Phê duyệt cẩm nang này
              </button>
            </form>
          )}
        </div>

        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink leading-tight">
          {manual.title}
        </h1>

        {manual.summary && (
          <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">
            {manual.summary}
          </p>
        )}

        {/* Metadata info */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 text-xs text-ink-muted">
          <span>Người biên soạn: <strong className="text-ink">{manual.author_name}</strong></span>
          {manual.approver_name && (
            <span>• Người xác nhận: <strong className="text-forest">{manual.approver_name}</strong></span>
          )}
          {manual.skill_name && (
            <span>• Bí quyết: <strong className="text-ink">{manual.skill_name}</strong></span>
          )}
        </div>
      </div>

      {/* SECTION 1: DỤNG CỤ & NGUYÊN LIỆU GIA TRUYỀN */}
      {manual.ingredients && manual.ingredients.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-serif font-bold text-xl text-ink">
              Dụng Cụ & Nguyên Liệu Chuẩn Bị
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {manual.ingredients.map((item, index) => (
              <div
                key={index}
                className="bg-cream-50/70 border border-stone-200 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
                    <span>{item.name}</span>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-ink-muted italic pl-3">{item.notes}</p>
                  )}
                </div>
                {item.amount && (
                  <span className="font-mono text-forest bg-white border border-stone-200 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0">
                    {item.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CÁC BƯỚC THỰC HÀNH STEP-BY-STEP */}
      <div className="space-y-6">
        <div>
          <h2 className="font-serif font-bold text-2xl text-ink">Các Bước Thực Hành</h2>
        </div>

        <div className="space-y-6">
          {manual.steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4"
            >
              {/* Step Title Header */}
              <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                <span className="w-8 h-8 rounded-full bg-forest text-cream-50 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {step.step_number}
                </span>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-ink">
                  {step.title}
                </h3>
              </div>

              {/* Instructions */}
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                {step.instructions}
              </p>

              {/* SUCCESS SIGNS (Dấu hiệu làm đúng) */}
              {step.success_signs && (
                <div className="bg-cream-100/60 border border-forest/20 rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-forest">
                    Dấu hiệu làm đúng để người học kiểm chứng:
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed font-medium">
                    {step.success_signs}
                  </p>
                </div>
              )}

              {/* EVIDENCE REFERENCE */}
              {(step.evidence_asset_id || step.evidence_quote) && (
                <div className="bg-cream-50/50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted font-semibold">
                    <span className="flex items-center gap-1 text-ink">
                      <span>Trích lời người truyền dạy đối chiếu:</span>
                      {step.start_time_seconds != null && (
                        <span className="text-forest font-mono">
                          [{step.start_time_seconds}s - {step.end_time_seconds}s]
                        </span>
                      )}
                    </span>
                    {step.evidence_asset_id && sourcesById.has(step.evidence_asset_id) && (
                      <a href={`${sourcesById.get(step.evidence_asset_id)!.file_path}${step.start_time_seconds != null ? `#t=${step.start_time_seconds}` : ""}`}
                        className="text-forest hover:underline">
                        Mở tư liệu gốc →
                      </a>
                    )}
                  </div>
                  {step.evidence_quote && <p className="text-ink-muted italic pl-4 border-l-2 border-forest/40 leading-relaxed">
                    &ldquo;{step.evidence_quote}&rdquo;
                  </p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: GÓC HỎI ĐÁP & THẮC MẮC THỰC HÀNH (Practice Notes) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Góc Hỏi Đáp & Thắc Mắc Thực Hành
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Khi thực hành nếu gặp bước chưa rõ, con cháu gửi câu hỏi để người dạy giải đáp bổ sung.
            </p>
          </div>
          <span className="text-xs text-ink-muted font-medium">
            {manual.notes.length} trao đổi
          </span>
        </div>

        {/* List of Practice Notes */}
        {manual.notes.length > 0 && (
          <div className="space-y-4">
            {manual.notes.map((note) => (
              <div
                key={note.id}
                className="bg-cream-50/60 border border-stone-200 rounded-2xl p-4 space-y-3 text-xs"
              >
                {/* Question */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">
                      {note.author_name} hỏi:
                    </span>
                    <span className="text-[10px] text-ink-muted font-mono">
                      {new Date(note.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-ink-muted pl-4 italic">&ldquo;{note.question}&rdquo;</p>
                </div>

                {/* Answer or Answer Form */}
                {note.answer ? (
                  <div className="bg-white border border-forest/20 rounded-xl p-3 space-y-1 mt-2">
                    <div className="font-semibold text-forest text-[11px] flex items-center gap-1">
                      <span>Lời giải đáp từ {note.answered_by_name || "Người truyền dạy"}:</span>
                    </div>
                    <p className="text-ink pl-3 leading-relaxed">{note.answer}</p>
                  </div>
                ) : (
                  canAnswer && (
                    <form action={answerPracticeNoteAction} className="pt-2 border-t border-stone-200 space-y-2">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="manual_id" value={manual.id} />
                      <input type="hidden" name="note_id" value={note.id} />
                      <label htmlFor={`ans_${note.id}`} className="block text-[11px] font-semibold text-forest">
                        Trả lời thắc mắc này:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`ans_${note.id}`}
                          type="text"
                          name="answer"
                          required
                          placeholder="Nhập câu trả lời hướng dẫn..."
                          className="flex-1 px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                        />
                        <button
                          type="submit"
                          className="bg-forest text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-forest-hover transition-colors shrink-0"
                        >
                          Gửi giải đáp
                        </button>
                      </div>
                    </form>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form gửi câu hỏi mới (mọi người trong kho đều gửi được) */}
        <form action={addPracticeNoteAction} className="pt-4 border-t border-stone-100 space-y-3">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="manual_id" value={manual.id} />

          <label htmlFor="question" className="block text-xs font-semibold text-ink">
            Gặp khó khăn khi thực hành? Đặt câu hỏi thắc mắc:
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              id="question"
              name="question"
              required
              placeholder="VD: Lúc rán bánh có nên đậy vung chảo không? Nếu bột nhão quá thì làm sao?..."
              className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-forest"
            />
            <button
              type="submit"
              className="btn bg-forest hover:bg-forest-hover text-white px-5 py-2.5 rounded-xl text-xs font-medium transition-colors shadow-sm shrink-0"
            >
              Gửi câu hỏi thực hành
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
