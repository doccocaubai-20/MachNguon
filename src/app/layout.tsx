import type { Metadata } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Mạch Nguồn - Kho Tri Thức Sống & Ký Ức Gia Đình",
  description: "Lưu giữ, liên kết và chuyển giao ký ức, kinh nghiệm gia đình qua các thế hệ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-cream-50 text-ink antialiased">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white/50 py-8 text-center text-xs text-ink-muted">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-forest text-cream-50 flex items-center justify-center font-bold text-xs">
                M
              </span>
              <span className="font-serif font-bold text-ink">Mạch Nguồn</span>
              <span>— Kho Ký Ức & Tri Thức Gia Đình</span>
            </div>
            <p className="text-stone-400">
              © 2026 Mạch Nguồn. Lưu truyền di sản, văn hóa và kinh nghiệm qua các thế hệ.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
