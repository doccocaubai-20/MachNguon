import Link from "next/link";
import { getCurrentUserOptional } from "@/lib/auth/session";

export default async function HomePage() {
  const currentUser = await getCurrentUserOptional();

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center py-12 sm:py-16 max-w-3xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-1.5 bg-forest/10 text-forest border border-forest/20 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide">
          Nền tảng Lưu Giữ Di Sản & Ký Ức Gia Đình
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-ink leading-tight">
          Giữ lại tiếng nói cha ông, <br />
          trao truyền kinh nghiệm cho con cháu.
        </h1>
        <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
          Kho tri thức sống giúp mỗi gia đình lưu giữ nguyên vẹn giọng kể, liên kết dòng thời gian, lập bản đồ tri thức và bảo tồn bí quyết thực hành qua các thế hệ.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={currentUser ? "/workspaces" : "/login"}
            className="btn inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-forest hover:bg-forest-hover text-white font-semibold text-base shadow-md transition-all hover:scale-102"
          >
            {currentUser ? "Mở kho gia đình của tôi →" : "Bắt đầu lưu giữ ký ức →"}
          </Link>
          {!currentUser && (
            <Link
              href="/login"
              className="btn inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-ink font-semibold text-base shadow-xs transition-all"
            >
              Đăng nhập tài khoản
            </Link>
          )}
        </div>

        {/* Current user badge */}
        {currentUser && (
          <div className="pt-2 text-xs text-ink-muted">
            Đang hoạt động: <strong className="text-ink">{currentUser.fullName}</strong> ({currentUser.email})
          </div>
        )}
      </section>

      {/* 4 Trụ Cột Tri Thức Gia Đình */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
            Bốn Trụ Cột Tri Thức Sống
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Không chỉ lưu văn bản vô hồn, Mạch Nguồn biến từng mảnh ký ức thành tài sản vô giá của gia tộc.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-forest/40 hover:shadow-md transition-all space-y-3">
            <span className="text-xs font-mono font-bold text-forest bg-forest/10 border border-forest/20 px-2.5 py-1 rounded-lg inline-block">
              TRỤ CỘT 01
            </span>
            <h3 className="font-serif font-bold text-lg text-ink">Lời kể nguyên bản</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Thu âm giọng kể chân thực của ông bà, cha mẹ. Gỡ băng chính xác theo mốc giây và đối chiếu nguồn gốc đáng tin cậy.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-forest/40 hover:shadow-md transition-all space-y-3">
            <span className="text-xs font-mono font-bold text-terracotta bg-terracotta/10 border border-terracotta/20 px-2.5 py-1 rounded-lg inline-block">
              TRỤ CỘT 02
            </span>
            <h3 className="font-serif font-bold text-lg text-ink">Phả hệ & Người thân</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Lưu giữ nhân thân, vai vế họ hàng, liên kết câu chuyện, kỷ vật và bài học truyền dạy gắn với từng thành viên.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-forest/40 hover:shadow-md transition-all space-y-3">
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block">
              TRỤ CỘT 03
            </span>
            <h3 className="font-serif font-bold text-lg text-ink">Dòng thời gian</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Các cột mốc biến cố, di cư, khởi nghiệp và kỷ niệm gia đình theo năm tháng, hỗ trợ độ chính xác mềm dẻo.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-forest/40 hover:shadow-md transition-all space-y-3">
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg inline-block">
              TRỤ CỘT 04
            </span>
            <h3 className="font-serif font-bold text-lg text-ink">Tủ kinh nghiệm</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Cẩm nang thực hành các món ăn, nghề gia truyền, bài thuốc và gia huấn đã được người kể đích thân phê duyệt.
            </p>
          </div>
        </div>
      </section>

      {/* Cơ chế bảo vệ & Phân quyền gia đình */}
      <section className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold text-forest uppercase tracking-wider">Bảo mật & Tôn trọng gia đình</span>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
            Biệt lập tuyệt đối, kiểm soát quyền truy cập chặt chẽ
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Mỗi kho là một không gian riêng tư được mã hóa, bảo vệ ký ức gia đình khỏi sự tò mò từ bên ngoài.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-cream-50/70 border border-cream-200/70 space-y-2">
            <div className="font-bold text-sm text-ink">
              Quản trị viên
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Tạo kho, mời người thân và cấu hình không gian chung.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cream-50/70 border border-cream-200/70 space-y-2">
            <div className="font-bold text-sm text-ink">
              Người kể chuyện
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Chủ thể phê duyệt nội dung và quyết định ai được phép lắng nghe.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cream-50/70 border border-cream-200/70 space-y-2">
            <div className="font-bold text-sm text-ink">
              Người đóng góp
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Tải ảnh, tư liệu bổ sung, ghi chép và đề xuất câu chuyện.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cream-50/70 border border-cream-200/70 space-y-2">
            <div className="font-bold text-sm text-ink">
              Người học & Người xem
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Con cháu khám phá ký ức, học làm theo cẩm nang và hỏi đáp.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
