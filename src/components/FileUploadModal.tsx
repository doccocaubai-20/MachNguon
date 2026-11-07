"use client";

import { useState } from "react";

interface Props {
  workspaceId: string;
  narrators: Array<{ id: string; fullName: string }>;
}

export function FileUploadModal({ workspaceId, narrators }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [narratorId, setNarratorId] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Vui lòng chọn tệp tư liệu cần tải lên.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (new FormData(e.currentTarget).has("shared_with_family")) {
        formData.set("shared_with_family", "true");
      }
      formData.append("workspace_id", workspaceId);
      formData.append("file", file);
      formData.append("title", title);
      if (narratorId) formData.append("narrator_id", narratorId);
      if (description) formData.append("description", description);

      const res = await fetch(`/api/workspaces/${workspaceId}/assets/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Tải lên thất bại.");
      }

      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi.");
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn inline-flex items-center gap-2 bg-cream-100 hover:bg-cream-200 text-forest border border-cream-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        Tải tệp từ máy tính
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-xl text-ink">Tải tư liệu gia đình</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-ink text-xs px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">
                  Chọn tệp (Âm thanh, Ảnh, PDF) <span className="text-terracotta">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="audio/*,image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest/10 file:text-forest hover:file:bg-forest/20 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">
                  Tiêu đề tư liệu <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Bản ghi âm chuyện xưa, Ảnh chụp gia đình..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Người kể / Người liên quan</label>
                <select
                  value={narratorId}
                  onChange={(e) => setNarratorId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
                >
                  <option value="">-- Chưa gán người kể --</option>
                  {narrators.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Mô tả chi tiết / Bối cảnh</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Thời điểm ghi lại, địa danh hoặc kỷ niệm đáng nhớ..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn px-4 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="shared_with_family" />
                  Chia sẻ với gia đình
                </label>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn px-5 py-2.5 bg-forest hover:bg-forest-hover disabled:bg-stone-300 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  {isUploading ? "Đang tải lên..." : "Tải lên kho tư liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
