"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createManualAction } from "../actions";

export default function ManualForm({ workspaceId, sources }: {
  workspaceId: string;
  sources: { id: string; title: string; asset_type: string }[];
}) {

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState<Array<{ name: string; amount: string; category: string; notes: string }>>([
    { name: "", amount: "", category: "ingredient", notes: "" },
  ]);
  const [steps, setSteps] = useState<Array<{ step_number: number; title: string; instructions: string; success_signs: string; evidence_asset_id?: string; evidence_quote?: string; start_time_seconds?: number }>>([
    {
      step_number: 1,
      title: "",
      instructions: "",
      success_signs: "",
      evidence_asset_id: "",
      evidence_quote: "",
    },
  ]);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", category: "ingredient", notes: "" }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        title: "",
        instructions: "",
        success_signs: "",
      },
    ]);
  };

  const removeStep = (idx: number) => {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    setSteps(updated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link
          href={`/workspaces/${workspaceId}/manuals`}
          className="hover:text-forest transition-colors"
        >
          ← Tủ kinh nghiệm
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Soạn cẩm nang thực hành</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">
            Soạn Cẩm Nang Thực Hành Mới
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Ghi chép cẩn thận từng bước, nguyên liệu và dấu hiệu làm đúng để con cháu làm theo không bị sai sót.
          </p>
        </div>

        <form action={createManualAction} className="space-y-6">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="ingredients" value={JSON.stringify(ingredients)} />
          <input type="hidden" name="steps" value={JSON.stringify(steps.map((step) => ({
            ...step, evidence_asset_id: step.evidence_asset_id || undefined,
          })))} />

          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-semibold text-ink">
              Tiêu đề cẩm nang <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bí quyết làm bánh gối giòn xốp gia truyền của bà Mai"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* Tóm tắt */}
          <div className="space-y-1.5">
            <label htmlFor="summary" className="block text-xs font-semibold text-ink">
              Lời tựa / Tóm tắt cẩm nang
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Giới thiệu xuất xứ món ăn hoặc ý nghĩa truyền thụ của bài học này..."
              className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50"
            />
          </div>

          {/* DỤNG CỤ & NGUYÊN LIỆU */}
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Danh sách nguyên liệu & dụng cụ ({ingredients.length}):
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-xs text-forest hover:underline font-semibold"
              >
                + Thêm mục
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên nguyên liệu / dụng cụ"
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...ingredients];
                      updated[idx].name = e.target.value;
                      setIngredients(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50"
                  />
                  <input
                    type="text"
                    placeholder="Định lượng"
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...ingredients];
                      updated[idx].amount = e.target.value;
                      setIngredients(updated);
                    }}
                    className="w-28 px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="text-stone-400 hover:text-red-500 text-xs px-2"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CÁC BƯỚC THỰC HÀNH */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Các bước thực hành ({steps.length}):
              </label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs text-forest hover:underline font-semibold"
              >
                + Thêm bước tiếp theo
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-cream-50/60 border border-stone-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-forest">
                      Bước {step.step_number}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-stone-400 hover:text-red-500 text-xs"
                      >
                        Xóa bước này
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Tiêu đề bước (VD: Pha và nhào bột, Căn lửa chảo mỡ...)"
                    value={step.title}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[idx].title = e.target.value;
                      setSteps(updated);
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white font-medium"
                  />

                  <textarea
                    rows={3}
                    required
                    placeholder="Mô tả chi tiết cách thực hiện..."
                    value={step.instructions}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[idx].instructions = e.target.value;
                      setSteps(updated);
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-white"
                  />

                  <div className="space-y-1 bg-cream-100/50 border border-forest/20 rounded-xl p-3">
                    <label className="block text-[11px] font-bold text-forest">
                      Dấu hiệu làm đúng (Verification Signs):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Bột mịn không dính tay, ấn nhẹ đàn hồi trở lại; chảo mỡ sủi tăm đều..."
                      value={step.success_signs}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].success_signs = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-ink-muted">
                        Tư liệu đã chia sẻ
                      </label>
                      <select
                        value={step.evidence_asset_id || ""}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx] = { ...updated[idx], evidence_asset_id: e.target.value, start_time_seconds: undefined };
                          setSteps(updated);
                        }}
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">Chọn tư liệu</option>
                        {sources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
                      </select>
                      {sources.some((source) => source.id === step.evidence_asset_id && source.asset_type === "audio") && (
                        <label className="grid gap-1 mt-2 text-xs">Vị trí bắt đầu (giây)
                          <input type="number" min="0" step="0.01" className="border rounded p-1"
                            value={step.start_time_seconds ?? ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? undefined : e.target.valueAsNumber;
                              setSteps(steps.map((item, index) => index === idx ? { ...item, start_time_seconds: value } : item));
                            }} />
                        </label>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-muted">
                        Trích dẫn chứng minh từ tư liệu (Quote):
                      </label>
                      <input
                        type="text"
                        placeholder="Đoạn trích chứng minh lời kể..."
                        value={step.evidence_quote || ""}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].evidence_quote = e.target.value;
                          setSteps(updated);
                        }}
                        className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Link
              href={`/workspaces/${workspaceId}/manuals`}
              className="btn px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="btn bg-forest hover:bg-forest-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Tạo cẩm nang thực hành
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
