"use client";

import { useState } from "react";
import Link from "next/link";
import { StoryDetailView, StoryStatus } from "@/contracts/story.contract";

interface StoryFilterViewProps {
  initialStories: StoryDetailView[];
  workspaceId: string;
  initialStatusFilter?: string;
}

export function StoryFilterView({
  initialStories,
  workspaceId,
  initialStatusFilter,
}: StoryFilterViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>(initialStatusFilter || "all");

  const statusMeta: Record<StoryStatus, { label: string; badge: string }> = {
    approved: { label: "Đã phê duyệt", badge: "bg-forest/10 text-forest border-forest/30" },
    pending_approval: { label: "Chờ người kể duyệt", badge: "bg-amber-50 text-amber-800 border-amber-200" },
    draft: { label: "Bản nháp", badge: "bg-stone-100 text-stone-600 border-stone-200" },
    rejected: { label: "Cần chỉnh sửa", badge: "bg-red-50 text-red-700 border-red-200" },
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    const newUrl = filter === "all"
      ? `/workspaces/${workspaceId}/stories`
      : `/workspaces/${workspaceId}/stories?status=${filter}`;
    window.history.replaceState(null, "", newUrl);
  };

  const filteredStories = initialStories.filter((story) => {
    if (activeFilter === "all") return true;
    return story.status === activeFilter;
  });

  const approvedCount = initialStories.filter((s) => s.status === "approved").length;
  const pendingCount = initialStories.filter((s) => s.status === "pending_approval").length;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-cream-100 rounded-xl w-fit text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleFilterClick("all")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeFilter === "all" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
          }`}
        >
          Tất cả ({initialStories.length})
        </button>
        <button
          type="button"
          onClick={() => handleFilterClick("approved")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeFilter === "approved" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
          }`}
        >
          Đã duyệt ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => handleFilterClick("pending_approval")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeFilter === "pending_approval" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
          }`}
        >
          Chờ duyệt ({pendingCount})
        </button>
      </div>

      {/* Stories List */}
      {filteredStories.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
          <h3 className="font-serif font-bold text-base text-ink">Chưa có câu chuyện nào trong mục này</h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            Hãy bắt đầu biên tập câu chuyện đầu tiên từ kho tư liệu ghi âm của gia đình.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredStories.map((story) => {
            const status = statusMeta[story.status] || {
              label: story.status,
              badge: "bg-stone-100 text-stone-700 border-stone-200",
            };

            return (
              <Link
                key={story.id}
                href={`/workspaces/${workspaceId}/stories/${story.id}`}
                className="bg-white border border-stone-200 hover:border-forest hover:shadow-sm rounded-2xl p-6 transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-cream-100 text-forest px-2.5 py-0.5 rounded-md">
                      {story.category}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-ink group-hover:text-forest transition-colors line-clamp-2">
                    {story.title}
                  </h3>

                  {story.summary && (
                    <p className="text-xs text-ink-muted line-clamp-3 leading-relaxed">
                      {story.summary}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    {story.narrator_name && (
                      <span className="font-medium text-ink">Người kể: {story.narrator_name}</span>
                    )}
                  </div>
                  <span className="text-forest font-semibold group-hover:underline">Chi tiết →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
