"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface WorkspaceNavTabsProps {
  workspaceId: string;
}

interface TabItem {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
}

export function WorkspaceNavTabs({ workspaceId }: WorkspaceNavTabsProps) {
  const pathname = usePathname();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseUrl = `/workspaces/${workspaceId}`;

  const tabs: TabItem[] = [
    { id: "overview", label: "Tổng quan", href: baseUrl, exact: true },
    { id: "persons", label: "Phả hệ & Hồ sơ", href: `${baseUrl}/persons` },
    { id: "assets", label: "Tư liệu gốc", href: `${baseUrl}/assets` },
    { id: "stories", label: "Lời kể", href: `${baseUrl}/stories` },
    { id: "timeline", label: "Niên biểu", href: `${baseUrl}/timeline` },
    { id: "graph", label: "Đồ thị", href: `${baseUrl}/graph` },
    { id: "manuals", label: "Cẩm nang", href: `${baseUrl}/manuals` },
    { id: "search", label: "Trợ lý & AI", href: `${baseUrl}/search` },
    { id: "members", label: "Thành viên", href: `${baseUrl}/members` },
  ];

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const currentPath = optimisticHref || pathname;

  const isTabActive = (tab: TabItem) => {
    if (tab.exact) {
      return currentPath === tab.href;
    }
    return currentPath.startsWith(tab.href);
  };

  return (
    <div className="w-full border-b border-stone-200 bg-white/90 backdrop-blur-md rounded-2xl px-2 py-1.5 shadow-xs transition-all">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={true}
              onClick={() => {
                startTransition(() => {
                  setOptimisticHref(tab.href);
                });
              }}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all select-none ${
                active
                  ? "bg-forest text-white shadow-xs font-semibold"
                  : "text-stone-600 hover:text-ink hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        {isPending && (
          <div className="ml-auto flex items-center gap-1.5 px-2 text-[11px] text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
            <span>Đang tải...</span>
          </div>
        )}
      </div>
    </div>
  );
}
