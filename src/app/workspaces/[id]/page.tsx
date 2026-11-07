import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const service = new WorkspaceService(db);

  let workspaceData;
  let errorMsg = "";

  try {
    workspaceData = await service.getWorkspace(currentUser.id, id);
  } catch (err: any) {
    errorMsg = err.message || "Truy cập bị từ chối.";
  }

  if (errorMsg || !workspaceData) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">
          {errorMsg || "Bạn không có quyền truy cập vào kho gia đình này hoặc tư cách thành viên đã bị thu hồi."}
        </p>
        <div className="pt-2">
          <Link
            href="/workspaces"
            className="btn inline-flex items-center px-4 py-2 bg-stone-100 hover:bg-stone-200 text-ink text-sm rounded-xl font-medium transition-colors"
          >
            ← Quay lại danh sách kho của bạn
          </Link>
        </div>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;

  const roleBadgeMap: Record<string, { label: string; color: string; desc: string }> = {
    admin: {
      label: "Quản trị viên",
      color: "bg-forest/10 text-forest border-forest/30",
      desc: "Có toàn quyền cấu hình kho, mời thành viên và phân quyền.",
    },
    contributor: {
      label: "Người đóng góp",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      desc: "Được phép tải tư liệu, thu âm và đề xuất câu chuyện.",
    },
    viewer: {
      label: "Người xem",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      desc: "Được khám phá và đặt câu hỏi trên dữ liệu đã duyệt.",
    },
    narrator: {
      label: "Người kể chuyện",
      color: "bg-terracotta/10 text-terracotta border-terracotta/30",
      desc: "Có quyền phê duyệt nội dung và quyết định phạm vi chia sẻ.",
    },
  };

  const badge = roleBadgeMap[currentMember.role] || {
    label: currentMember.role,
    color: "bg-stone-100 text-stone-700 border-stone-200",
    desc: "",
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <span className="text-ink font-medium">{workspace.name}</span>
      </div>

      {/* Workspace Header */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">{workspace.name}</h1>
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${badge.color}`}>
              Vai trò: {badge.label}
            </span>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            {workspace.description || "Chưa có lời giới thiệu cho kho gia đình."}
          </p>
          <p className="text-xs text-stone-400">
            {badge.desc}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={`/workspaces/${workspace.id}/members`}
            className="btn inline-flex items-center gap-2 bg-cream-100 hover:bg-cream-200 text-forest border border-cream-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Quản lý thành viên
          </Link>
        </div>
      </div>

      {/* Grid các tính năng phân hệ gia đình */}
      <div className="space-y-4">
        <h2 className="font-serif font-bold text-xl text-ink">Các phân hệ tri thức gia đình</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Thành viên */}
          <Link
            href={`/workspaces/${workspace.id}/members`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-forest bg-forest/10 border border-forest/20 px-2.5 py-1 rounded-lg">
                01 • THÀNH VIÊN
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Thành viên & Phân quyền
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Mời người thân, quản lý vai trò trong gia đình (Quản trị viên, Người kể, Người đóng góp, Người xem) và bảo mật truy cập.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Hồ sơ */}
          <Link
            href={`/workspaces/${workspace.id}/persons`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-terracotta bg-terracotta/10 border border-terracotta/20 px-2.5 py-1 rounded-lg">
                02 • PHẢ HỆ
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Hồ sơ người thân
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Thông tin thế hệ, ông bà, cha mẹ, con cháu và mạng lưới liên kết phả hệ gia đình.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Tư liệu */}
          <Link
            href={`/workspaces/${workspace.id}/assets`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                03 • TƯ LIỆU GỐC
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Kho tư liệu & Ghi âm
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Thu âm giọng kể trực tiếp, lưu trữ ảnh gốc, văn bản và tài liệu chép tay an toàn.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Câu chuyện */}
          <Link
            href={`/workspaces/${workspace.id}/stories`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                04 • LỜI KỂ NGUYÊN BẢN
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Câu chuyện có nguồn
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Bản chép lời theo mốc thời gian, bản biên tập đối chiếu nguồn gốc và được người kể duyệt.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Dòng thời gian */}
          <Link
            href={`/workspaces/${workspace.id}/timeline`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                05 • NIÊN BIỂU
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Dòng thời gian
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Các cột mốc sự kiện quan trọng trong dòng họ theo niên đại gần đúng, gắn người và tư liệu.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Bản đồ tri thức */}
          <Link
            href={`/workspaces/${workspace.id}/graph`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                06 • ĐỒ THỊ
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Bản đồ tri thức
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Đồ thị liên kết mạng lưới người thân, quê hương, sự kiện và kỹ năng có nguồn đối chiếu.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Tủ kinh nghiệm */}
          <Link
            href={`/workspaces/${workspace.id}/manuals`}
            className="bg-white border border-stone-200 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                07 • CẨM NANG GIA TRUYỀN
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Tủ kinh nghiệm thực hành
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Cẩm nang truyền dạy chi tiết các món ăn, nghề gia truyền có gắn mốc lời kể gốc và dấu hiệu làm đúng.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Mở phân hệ →</span>
          </Link>

          {/* Tìm kiếm & Trợ lý */}
          <Link
            href={`/workspaces/${workspace.id}/search`}
            className="bg-white border border-forest/30 hover:border-forest hover:shadow-md p-6 rounded-3xl transition-all space-y-3 block group bg-gradient-to-br from-white via-cream-50/40 to-forest/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-forest bg-forest/10 border border-forest/20 px-2.5 py-1 rounded-lg">
                08 • TRỢ LÝ
              </span>
              <span className="text-[10px] bg-forest text-white px-2.5 py-0.5 rounded-full font-semibold">
                Gemini 3.5 Flash
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors">
              Trợ lý Ký ức & Xưởng AI
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Hỏi đáp thông minh cùng Google Gemini, đối soát dẫn nguồn chính xác từng giây ghi âm; bóc tách câu chuyện & chắp bút hồi ký tiền nhân.
            </p>
            <span className="text-xs text-forest font-semibold inline-block pt-1">Trải nghiệm ngay →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
