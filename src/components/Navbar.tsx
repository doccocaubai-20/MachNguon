import Link from "next/link";
import { getCurrentUserOptional } from "@/lib/auth/session";
import { demoMode } from "@/lib/auth/mode";
import { logoutAction } from "@/app/login/actions";
import { UserSwitcher } from "./UserSwitcher";

export async function Navbar() {
  const currentUser = await getCurrentUserOptional();

  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:min-h-16">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-forest text-cream-50 flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              M
            </span>
            <div>
              <span className="whitespace-nowrap font-serif font-bold text-xl tracking-tight text-ink">
                Mạch Nguồn
              </span>
              <span className="hidden sm:inline-block ml-2.5 text-[11px] text-forest font-medium bg-forest/10 border border-forest/20 px-2 py-0.5 rounded-full">
                Kho Ký Ức Gia Đình
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-ink-muted">
            <Link href="/workspaces" className="hover:text-forest transition-colors">
              Kho gia đình
            </Link>
          </nav>
        </div>

        <div className={`flex min-w-0 items-center gap-3 sm:gap-4 ${currentUser ? "w-full justify-between sm:w-auto" : "ml-auto"}`}>
          {currentUser ? (
            <>
              {demoMode ? (
                <UserSwitcher currentUser={currentUser} />
              ) : (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-100/80 border border-stone-200 text-xs">
                  <span className="w-6 h-6 rounded-full bg-forest text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.fullName.charAt(0)}
                  </span>
                  <span className="font-semibold text-ink truncate max-w-40">{currentUser.fullName}</span>
                </div>
              )}
              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  className="whitespace-nowrap text-xs font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 border border-stone-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-medium shadow-sm transition-all"
            >
              Đăng nhập →
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
