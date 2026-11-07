"use client";

import { useState } from "react";
import { AssetDetailView, AssetType } from "@/contracts/asset.contract";
import { deleteAssetAction } from "./actions";

interface AssetsFilterViewProps {
  initialAssets: AssetDetailView[];
  workspaceId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialTypeFilter?: string;
}

export function AssetsFilterView({
  initialAssets,
  workspaceId,
  currentUserId,
  isAdmin,
  initialTypeFilter,
}: AssetsFilterViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>(initialTypeFilter || "all");
  const [searchQuery, setSearchQuery] = useState("");

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    const newUrl = filter === "all"
      ? `/workspaces/${workspaceId}/assets`
      : `/workspaces/${workspaceId}/assets?type=${filter}`;
    window.history.replaceState(null, "", newUrl);
  };

  const filteredAssets = initialAssets.filter((asset) => {
    if (activeFilter !== "all" && asset.asset_type !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = asset.title.toLowerCase().includes(q);
      const matchDesc = (asset.description || "").toLowerCase().includes(q);
      const matchNarrator = (asset.narrator_name || "").toLowerCase().includes(q);
      return matchTitle || matchDesc || matchNarrator;
    }
    return true;
  });

  const audioCount = initialAssets.filter((a) => a.asset_type === "audio").length;
  const imageCount = initialAssets.filter((a) => a.asset_type === "image").length;
  const docCount = initialAssets.filter((a) => a.asset_type === "document").length;

  return (
    <div className="space-y-6">
      {/* Filter Tabs and Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-cream-100 rounded-xl w-fit text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleFilterClick("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeFilter === "all" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
            }`}
          >
            Tất cả ({initialAssets.length})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("audio")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeFilter === "audio" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
            }`}
          >
            Ghi âm ({audioCount})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("image")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeFilter === "image" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
            }`}
          >
            Hình ảnh ({imageCount})
          </button>
          <button
            type="button"
            onClick={() => handleFilterClick("document")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeFilter === "document" ? "bg-white text-forest shadow-xs font-bold" : "text-ink-muted hover:text-ink"
            }`}
          >
            Tài liệu PDF ({docCount})
          </button>
        </div>

        {/* Quick Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Lọc nhanh tên tư liệu..."
            className="w-full text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-forest"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
          <h3 className="font-serif font-bold text-base text-ink">Kho chưa có tư liệu nào trong mục này</h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {searchQuery
              ? `Không tìm thấy kết quả nào khớp với "${searchQuery}". Hãy thử từ khóa khác.`
              : "Hãy thu âm lời kể hoặc tải tệp tư liệu từ máy tính lên kho."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => {
            const canDelete = isAdmin || asset.uploaded_by === currentUserId;

            return (
              <div
                key={asset.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-forest/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-cream-100 text-forest border border-cream-200 shrink-0">
                        {asset.asset_type === "audio" ? "Audio" : asset.asset_type === "image" ? "Ảnh" : "Tài liệu"}
                      </span>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-ink line-clamp-1">{asset.title}</h3>
                        <span className="text-[10px] text-ink-muted">
                          {asset.file_name} • {formatFileSize(asset.byte_size)}
                        </span>
                      </div>
                    </div>

                    {asset.narrator_name && (
                      <span className="text-[10px] bg-terracotta/10 text-terracotta border border-terracotta/20 px-2 py-0.5 rounded-full font-semibold shrink-0">
                        {asset.narrator_name}
                      </span>
                    )}
                  </div>

                  {asset.description && (
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                      {asset.description}
                    </p>
                  )}

                  {/* Preview Player / File */}
                  {asset.asset_type === "audio" && (
                    <div className="bg-cream-50/70 p-2.5 rounded-xl border border-cream-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-ink-muted font-medium px-1">
                        <span>Trình phát giọng gốc</span>
                        {asset.duration_seconds && (
                          <span className="font-mono text-xs text-terracotta">
                            {formatDuration(asset.duration_seconds)}
                          </span>
                        )}
                      </div>
                      <audio src={asset.file_path} controls className="w-full h-9 rounded-lg" />
                    </div>
                  )}

                  {asset.asset_type === "image" && (
                    <div className="rounded-xl overflow-hidden border border-stone-200 max-h-48 bg-stone-100 flex items-center justify-center">
                      <img
                        src={asset.file_path}
                        alt={asset.title}
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}

                  {asset.asset_type === "document" && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                      <span className="text-stone-600">Tài liệu định dạng PDF đã được lưu trữ an toàn</span>
                      <a
                        href={asset.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-forest hover:underline font-semibold"
                      >
                        Mở xem →
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-ink-muted">
                  <span>Đăng bởi: {asset.uploader_name}</span>

                  <div className="flex items-center gap-3">
                    <a
                      href={asset.file_path}
                      download={asset.file_name}
                      className="text-forest hover:underline font-medium text-xs"
                    >
                      Tải về
                    </a>

                    {canDelete && (
                      <form action={deleteAssetAction}>
                        <input type="hidden" name="workspace_id" value={workspaceId} />
                        <input type="hidden" name="asset_id" value={asset.id} />
                        <button
                          type="submit"
                          className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                        >
                          Xóa
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
