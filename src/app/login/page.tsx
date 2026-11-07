import Link from "next/link";
import { DEMO_USERS } from "@/lib/auth/mock-users";
import { loginAsDemoUserAction, loginWithEmailAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="max-w-lg mx-auto my-8 sm:my-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-forest text-cream-50 flex items-center justify-center font-serif font-bold text-2xl mx-auto shadow-md">
          M
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Đăng Nhập Mạch Nguồn</h1>
        <p className="text-xs sm:text-sm text-ink-muted max-w-sm mx-auto">
          Kho ký ức & di sản tri thức gia đình được bảo vệ an toàn và phân quyền nghiêm ngặt.
        </p>
      </div>

      {/* Thành viên gia đình đăng nhập */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-3.5 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-base text-ink">Chọn tài khoản thành viên</h2>
            <p className="text-xs text-ink-muted">Đăng nhập trực tiếp theo vai trò gia đình đã được cấp quyền</p>
          </div>
          <span className="text-xs bg-forest/10 text-forest font-semibold px-2.5 py-0.5 rounded-full border border-forest/20">
            Gia đình họ Nguyễn
          </span>
        </div>

        <div className="space-y-2.5">
          {DEMO_USERS.filter((u) => u.id !== "99999999-9999-9999-9999-999999999999").map((u) => (
            <form key={u.id} action={loginAsDemoUserAction}>
              <input type="hidden" name="userId" value={u.id} />
              <button
                type="submit"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-forest/50 hover:bg-forest/5 transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-cream-100 border border-stone-200/60 flex items-center justify-center text-sm font-bold text-forest shrink-0">
                    {u.avatarUrl || u.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink group-hover:text-forest transition-colors truncate">
                      {u.fullName}
                    </div>
                    <div className="text-xs text-ink-muted truncate">{u.roleDescription}</div>
                  </div>
                </div>
                <span className="text-xs text-forest font-semibold shrink-0 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Vào kho →
                </span>
              </button>
            </form>
          ))}
        </div>

        {/* Đăng nhập bằng Email & Mật khẩu */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <details className="text-xs group">
            <summary className="font-semibold text-ink-muted hover:text-ink cursor-pointer list-none flex items-center justify-between py-1">
              <span>Đăng nhập bằng Email và Mật khẩu cá nhân</span>
              <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="pt-3 space-y-3">
              {error === "credentials" && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  Email hoặc mật khẩu không chính xác.
                </p>
              )}

              <form action={loginWithEmailAction} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink">Địa chỉ email</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    maxLength={254}
                    required
                    placeholder="nguyenvan@giadinh.vn"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-ink">Mật khẩu</label>
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    maxLength={256}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-forest"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn bg-forest hover:bg-forest-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  Xác nhận đăng nhập
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>

      <div className="text-center text-xs text-ink-muted">
        <Link href="/" className="hover:text-forest transition-colors">
          ← Quay lại trang chủ Mạch Nguồn
        </Link>
      </div>
    </div>
  );
}
