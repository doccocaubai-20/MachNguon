import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { PersonService } from "@/lib/server/person.service";
import { hasPermission } from "@/lib/server/permissions";
import {
  addRelationshipAction,
  deleteRelationshipAction,
  deletePersonAction,
  updatePersonAction,
} from "../actions";
import { RelationshipType } from "@/contracts/person.contract";

interface Props {
  params: Promise<{ id: string; personId: string }>;
}

export default async function PersonDetailPage({ params }: Props) {
  const { id: workspaceId, personId } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const personService = new PersonService(db);

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
        <p className="text-sm text-ink-muted">Bạn không có quyền truy cập hồ sơ trong kho gia đình này.</p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const canEdit = hasPermission(currentMember.role, "story:propose");
  const isAdmin = hasPermission(currentMember.role, "member:revoke");

  let personData: Awaited<ReturnType<PersonService["getPerson"]>>;
  let context: Awaited<ReturnType<PersonService["getPersonKnowledgeContext"]>>;
  let allPersons: Awaited<ReturnType<PersonService["listPersons"]>> = [];
  try {
    const [pData, ctxData, pList] = await Promise.all([
      personService.getPerson(currentUser.id, workspaceId, personId),
      personService.getPersonKnowledgeContext(currentUser.id, workspaceId, personId),
      personService.listPersons(currentUser.id, workspaceId),
    ]);
    personData = pData;
    context = ctxData;
    allPersons = pList;
  } catch (err: any) {
    notFound();
  }

  const { person, relationships } = personData;
  const candidatePersons = allPersons.filter((p) => p.id !== person.id);

  const relationshipLabels: Record<RelationshipType, string> = {
    parent: "Cha / Mẹ",
    child: "Con",
    spouse: "Vợ / Chồng",
    sibling: "Anh / Chị / Em ruột",
    grandparent: "Ông / Bà",
    grandchild: "Cháu",
    relative: "Họ hàng thân thuộc",
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}/persons`} className="hover:text-forest">Hồ sơ người thân</Link>
        <span>/</span>
        <span className="text-ink font-medium">{person.full_name}</span>
      </div>

      {/* Profile Banner */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-cream-100 border border-cream-200 flex items-center justify-center font-serif font-bold text-2xl sm:text-3xl text-forest shadow-sm shrink-0">
              {person.full_name.charAt(0)}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <h1 className="break-words font-semibold text-2xl leading-snug tracking-tight sm:text-4xl text-ink">{person.full_name}</h1>
                {person.nick_name && (
                  <span className="text-sm bg-terracotta/10 text-terracotta border border-terracotta/20 px-2.5 py-0.5 rounded-full font-semibold">
                    {person.nick_name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-relaxed text-ink-muted">
                <span>{person.gender === "female" ? "Giới tính: Nữ" : "Giới tính: Nam"}</span>
                <span>•</span>
                <span>{person.birth_date ? `Năm sinh: ${person.birth_date}` : "Chưa rõ năm sinh"}</span>
                {person.death_date && <span>(Mất năm: {person.death_date})</span>}
              </div>

              {person.bio && (
                <p className="max-w-prose pt-1 text-sm leading-relaxed text-ink-muted sm:text-base sm:leading-7">
                  {person.bio}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <form action={deletePersonAction}>
                <input type="hidden" name="workspace_id" value={workspace.id} />
                <input type="hidden" name="person_id" value={person.id} />
                <button
                  type="submit"
                  className="btn text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl font-medium transition-colors"
                >
                  Xóa hồ sơ
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột Trái: Mối Quan Hệ Gia Đình (Chiếm 2 cột) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-lg leading-snug text-ink">Mối quan hệ gia đình & phả hệ</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  Liên kết hai chiều chuẩn mực: Khi gán quan hệ, hệ thống tự động cập nhật cả hai phía.
                </p>
              </div>
              <span className="text-xs bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-full text-ink font-semibold">
                {relationships.length} liên kết
              </span>
            </div>

            {relationships.length === 0 ? (
              <div className="p-6 bg-cream-50/50 rounded-xl border border-dashed border-stone-200 text-center text-xs text-ink-muted">
                Chưa có liên kết họ hàng nào được thiết lập cho {person.full_name}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relationships.map((rel) => (
                  <div
                    key={rel.relationshipId}
                    className="p-4 border border-stone-200 hover:border-forest/40 rounded-xl bg-white flex items-center justify-between gap-3 transition-colors"
                  >
                    <Link
                      href={`/workspaces/${workspace.id}/persons/${rel.relatedPersonId}`}
                      className="flex items-center gap-3 overflow-hidden group"
                    >
                      <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center font-serif font-bold text-xs text-forest shrink-0">
                        {rel.fullName.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-forest/10 text-forest">
                            {relationshipLabels[rel.relationshipType] || rel.relationshipType}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-sm text-ink group-hover:text-forest transition-colors truncate">
                          {rel.fullName}
                        </h4>
                        {rel.notes && (
                          <p className="text-[11px] text-ink-muted truncate">{rel.notes}</p>
                        )}
                      </div>
                    </Link>

                    {canEdit && (
                      <form action={deleteRelationshipAction} className="shrink-0">
                        <input type="hidden" name="workspace_id" value={workspace.id} />
                        <input type="hidden" name="person_id" value={person.id} />
                        <input type="hidden" name="relationship_id" value={rel.relationshipId} />
                          <button
                            type="submit"
                            className="text-stone-400 hover:text-red-500 px-2 py-0.5 text-xs font-medium transition-colors"
                            title="Hủy liên kết quan hệ này"
                          >
                            Xóa
                          </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tư liệu & Kỹ năng truyền dạy liên quan (Dữ liệu thực tế từ DB) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg leading-snug text-ink">Tri thức & Kỹ năng gắn với người thân</h2>
                <p className="text-xs text-ink-muted">
                  Tự động liên kết từ Kho tư liệu, Dòng thời gian, Bản đồ tri thức và Cẩm nang gia đình.
                </p>
              </div>
              <span className="text-xs bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-full text-ink font-semibold">
                {context.manuals.length + context.skills.length + context.stories.length + context.assets.length} liên kết
              </span>
            </div>

            {context.manuals.length === 0 && context.skills.length === 0 && context.stories.length === 0 && context.assets.length === 0 ? (
              <div className="p-6 bg-cream-50/50 rounded-xl border border-dashed border-stone-200 text-center text-xs text-ink-muted">
                Chưa có tư liệu, câu chuyện hay kỹ năng nào được gắn với {person.full_name}.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Cẩm nang thực hành */}
                {context.manuals.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-cream-200 bg-cream-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-terracotta bg-terracotta/10 px-2.5 py-0.5 rounded-full border border-terracotta/20">
                        Cẩm nang thực hành
                      </span>
                      <span className="text-[11px] text-ink-muted">Trạng thái: {m.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}</span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-ink">{m.title}</h3>
                    {m.summary && <p className="text-xs text-ink-muted leading-relaxed">{m.summary}</p>}
                    <div className="pt-1">
                      <Link href={`/workspaces/${workspace.id}/manuals/${m.id}`} className="text-xs text-forest font-semibold hover:underline">
                        Mở cẩm nang thực hành →
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Kỹ năng từ Bản đồ tri thức */}
                {context.skills.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-stone-200 bg-white space-y-1">
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Kỹ năng & Bí quyết
                    </span>
                    <h3 className="font-serif font-bold text-sm text-ink">{s.name}</h3>
                    {s.description && <p className="text-xs text-ink-muted leading-relaxed">{s.description}</p>}
                  </div>
                ))}

                {/* Câu chuyện */}
                {context.stories.map((st) => (
                  <div key={st.id} className="p-4 rounded-xl border border-stone-200 bg-white space-y-1">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Câu chuyện & Lời kể
                    </span>
                    <h3 className="font-serif font-bold text-sm text-ink">{st.title}</h3>
                    {st.summary && <p className="text-xs text-ink-muted leading-relaxed">{st.summary}</p>}
                    <div className="pt-1">
                      <Link href={`/workspaces/${workspace.id}/stories/${st.id}`} className="text-xs text-forest font-semibold hover:underline">
                        Đọc câu chuyện & nghe đối soát →
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Tư liệu gốc */}
                {context.assets.length > 0 && (
                  <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                    <span className="text-xs font-semibold text-forest bg-forest/10 px-2.5 py-0.5 rounded-full border border-forest/20">
                      Tư liệu gốc liên quan
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {context.assets.map((a) => (
                        <div key={a.id} className="p-2.5 rounded-lg border border-stone-100 bg-stone-50 text-xs space-y-0.5">
                          <div className="font-medium text-ink truncate">{a.title}</div>
                          <div className="text-[11px] text-ink-muted capitalize">
                            Loại: {a.asset_type} {a.duration_seconds ? `• ${Math.floor(a.duration_seconds / 60)}p` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Form Thêm Quan Hệ Gia Đình (Chiếm 1 cột) */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg leading-snug text-ink">Gán quan hệ gia đình</h2>
              <p className="text-xs text-ink-muted">
                Chọn một người thân khác trong kho để thiết lập liên kết họ hàng.
              </p>
            </div>

            {canEdit ? (
              candidatePersons.length > 0 ? (
                <form action={addRelationshipAction} className="space-y-4">
                  <input type="hidden" name="workspace_id" value={workspace.id} />
                  <input type="hidden" name="person_id" value={person.id} />

                  <div className="space-y-1.5">
                    <label htmlFor="related_person_id" className="block text-xs font-semibold text-ink">
                      Người thân liên kết <span className="text-terracotta">*</span>
                    </label>
                    <select
                      id="related_person_id"
                      name="related_person_id"
                      required
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                    >
                      {candidatePersons.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} {p.nick_name ? `(${p.nick_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="relationship_type" className="block text-xs font-semibold text-ink">
                      {person.full_name} là gì của người này? <span className="text-terracotta">*</span>
                    </label>
                    <select
                      id="relationship_type"
                      name="relationship_type"
                      required
                      defaultValue="parent"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                    >
                      <option value="parent">Cha / Mẹ</option>
                      <option value="child">Con</option>
                      <option value="spouse">Vợ / Chồng</option>
                      <option value="sibling">Anh / Chị / Em ruột</option>
                      <option value="grandparent">Ông / Bà</option>
                      <option value="grandchild">Cháu nội / ngoại</option>
                      <option value="relative">Họ hàng thân thuộc</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="block text-xs font-semibold text-ink">
                      Ghi chú thêm (tùy chọn)
                    </label>
                    <input
                      type="text"
                      id="notes"
                      name="notes"
                      placeholder="VD: Mẹ ruột, Cháu gái đầu lòng..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn w-full bg-forest hover:bg-forest-hover text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
                  >
                    + Lưu quan hệ gia đình
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-ink-muted">
                  Kho hiện chưa có người thân thứ hai. Hãy <Link href={`/workspaces/${workspace.id}/persons`} className="text-forest underline">thêm người thân khác</Link> trước để gán quan hệ.
                </div>
              )
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-ink-muted">
                Bạn đang ở chế độ xem chỉ đọc.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
