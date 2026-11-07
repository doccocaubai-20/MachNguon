"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SearchResultItem,
  SearchResultType,
  QAResponse,
} from "@/contracts/search.contract";
import {
  askQuestionAction,
  searchVaultAction,
  extractStoryWithAiAction,
  composeTributeWithAiAction,
} from "./actions";

interface SearchClientProps {
  workspaceId: string;
  workspaceName: string;
}

const QUICK_QUESTIONS = [
  "Bí quyết pha bột bánh gối của bà Mai là gì?",
  "Làm sao để biết dầu đã đủ nóng khi rán bánh gối?",
  "Bánh gối gồm những nguyên liệu gì?",
  "Bà Mai sinh năm bao nhiêu?",
  "Bác An là ai trong gia đình?",
  "Năm 1954 gia đình có sự kiện gì quan trọng?",
  "Ông nội thích đi du lịch ở đâu nhất?",
];

const DOMAIN_TABS: Array<{ id: SearchResultType | "all"; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "person", label: "Người thân" },
  { id: "asset", label: "Tư liệu gốc" },
  { id: "story", label: "Câu chuyện" },
  { id: "timeline", label: "Dòng thời gian" },
  { id: "entity", label: "Bản đồ tri thức" },
  { id: "manual", label: "Cẩm nang" },
];

export default function SearchClient({ workspaceId, workspaceName }: SearchClientProps) {
  // Navigation mode: "search-qa" | "ai-studio"
  const [activeMainTab, setActiveMainTab] = useState<"search-qa" | "ai-studio">("search-qa");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchResultType | "all">("all");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Q&A state
  const [qaQuestion, setQaQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [qaResponse, setQaResponse] = useState<QAResponse | null>(null);
  const [enableAi, setEnableAi] = useState(true);
  const [showBaseAnswer, setShowBaseAnswer] = useState(false);

  // AI Studio states
  const [storyInput, setStoryInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);

  const [tributeTopic, setTributeTopic] = useState("");
  const [tributeDetails, setTributeDetails] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [tributeResult, setTributeResult] = useState<string | null>(null);

  // Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const typeFilter = activeTab === "all" ? undefined : activeTab;
      const res = await searchVaultAction(workspaceId, searchQuery, typeFilter);
      if (res.success && res.data) {
        setSearchResults(res.data);
        setHasSearched(true);
      } else {
        setErrorMsg(res.error || "Tìm kiếm thất bại");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTabChange = async (tab: SearchResultType | "all") => {
    setActiveTab(tab);
    if (searchQuery.trim()) {
      setIsSearching(true);
      try {
        const typeFilter = tab === "all" ? undefined : tab;
        const res = await searchVaultAction(workspaceId, searchQuery, typeFilter);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleAsk = async (questionText?: string) => {
    const q = (questionText || qaQuestion).trim();
    if (!q) return;

    if (questionText) setQaQuestion(questionText);
    setIsAsking(true);
    setErrorMsg(null);
    try {
      const res = await askQuestionAction(workspaceId, q, enableAi);
      if (res.success && res.data) {
        setQaResponse(res.data);
      } else {
        setErrorMsg(res.error || "Không thể thực hiện hỏi đáp");
      }
    } finally {
      setIsAsking(false);
    }
  };

  const handleExtractStory = async () => {
    if (!storyInput.trim()) return;
    setIsExtracting(true);
    setErrorMsg(null);
    try {
      const res = await extractStoryWithAiAction(storyInput);
      if (res.success && res.data) {
        setExtractionResult(res.data);
      } else {
        setErrorMsg(res.error || "Không thể trích xuất câu chuyện");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleComposeTribute = async () => {
    if (!tributeTopic.trim()) return;
    setIsComposing(true);
    setErrorMsg(null);
    try {
      const res = await composeTributeWithAiAction(tributeTopic, tributeDetails);
      if (res.success && res.data) {
        setTributeResult(res.data);
      } else {
        setErrorMsg(res.error || "Không thể tạo bài tri ân");
      }
    } finally {
      setIsComposing(false);
    }
  };

  const getTypeBadge = (type: SearchResultType) => {
    switch (type) {
      case "person":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Người thân</span>;
      case "asset":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Tư liệu gốc</span>;
      case "story":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Câu chuyện</span>;
      case "timeline":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Dòng thời gian</span>;
      case "entity":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Bản đồ</span>;
      case "manual":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta border border-terracotta/20">Cẩm nang</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
            <Link href={`/workspaces/${workspaceId}`} className="hover:text-forest transition-colors">
              {workspaceName}
            </Link>
            <span>/</span>
            <span className="text-forest font-medium">Trợ Lý Ký Ức</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
            Trợ Lý Ký Ức Gia Đình
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Tra cứu thông tin, hỏi đáp đối chiếu nguồn gốc và đồng hành biên soạn gìn giữ ký ức người thân.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-stone-200">
        <button
          onClick={() => setActiveMainTab("search-qa")}
          className={`pb-3 px-2 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === "search-qa"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Hỏi đáp ký ức & Tìm kiếm</span>
        </button>

        <button
          onClick={() => setActiveMainTab("ai-studio")}
          className={`pb-3 px-2 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === "ai-studio"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Xưởng biên soạn di sản</span>
          <span className="text-[10px] bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">
            Trợ lý Thông minh
          </span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 px-2 py-0.5 rounded">Đóng</button>
        </div>
      )}

      {/* VIEW 1: SEARCH & STRICT Q&A */}
      {activeMainTab === "search-qa" && (
        <div className="space-y-10">
          {/* SECTION 1: TRỢ LÝ HỎI ĐÁP KÝ ỨC */}
          <section className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h2 className="font-serif font-bold text-xl text-ink">
                  Hỏi Đáp Ký Ức Gia Đình
                </h2>
                <p className="text-xs text-ink-muted">
                  Hỏi đáp tự nhiên về người thân, cẩm nang gia truyền và các sự kiện lịch sử có đối soát
                </p>
              </div>

              {/* AI Mode Switch */}
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl">
                <span className="text-xs font-medium text-stone-700">Trợ lý AI:</span>
                <button
                  type="button"
                  onClick={() => setEnableAi(!enableAi)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all ${
                    enableAi
                      ? "bg-forest text-white shadow-xs"
                      : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                  }`}
                >
                  {enableAi ? "Đang bật" : "Tắt"}
                </button>
              </div>
            </div>

            {/* Form hỏi đáp */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="space-y-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="Đặt câu hỏi về người thân, món ăn truyền thống, câu chuyện gia đình..."
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isAsking || !qaQuestion.trim()}
                  className="btn inline-flex items-center gap-2 bg-forest hover:bg-forest-hover text-white px-6 py-3 rounded-2xl font-medium text-sm transition-all disabled:opacity-50 shadow-sm"
                >
                  {isAsking ? "Đang tổng hợp..." : "Trả lời"}
                </button>
              </div>

              {/* Quick chips */}
              <div className="space-y-1.5">
                <div className="text-xs text-ink-muted font-medium">Câu hỏi gợi ý:</div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAsk(q)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-forest/5 hover:border-forest/40 hover:text-forest text-stone-700 transition-all text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Khung kết quả Q&A */}
            {qaResponse && (
              <div className="mt-6 border-t border-stone-100 pt-6 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-ink-muted">
                    Câu hỏi: <strong className="text-ink">"{qaResponse.question}"</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {qaResponse.ai_generated && (
                      <span className="inline-flex items-center text-xs bg-forest/10 text-forest border border-forest/20 px-3 py-1 rounded-full font-semibold">
                        Trợ lý Ký ức
                      </span>
                    )}

                    {qaResponse.has_sufficient_data ? (
                      <span className="inline-flex items-center text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                        Có trích dẫn xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-medium">
                        Chưa đủ dữ liệu - Không phỏng đoán
                      </span>
                    )}
                  </div>
                </div>

                {/* Khung câu trả lời */}
                <div
                  className={`p-5 rounded-2xl border ${
                    qaResponse.has_sufficient_data
                      ? "bg-forest/5 border-forest/20 text-ink"
                      : "bg-amber-50/50 border-amber-200/80 text-stone-700"
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-line font-medium">
                    {qaResponse.answer}
                  </div>

                  {qaResponse.ai_generated && qaResponse.base_answer && (
                    <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500">
                      <button
                        type="button"
                        onClick={() => setShowBaseAnswer(!showBaseAnswer)}
                        className="text-forest hover:underline font-semibold"
                      >
                        {showBaseAnswer ? "Ẩn bản trích dẫn gốc ↑" : "Xem bản trích dẫn gốc ↓"}
                      </button>
                      <span className="text-[11px] text-stone-400">
                        Được tổng hợp từ {qaResponse.citations.length} nguồn xác thực
                      </span>
                    </div>
                  )}

                  {showBaseAnswer && qaResponse.base_answer && (
                    <div className="mt-2 p-3 bg-white/80 rounded-xl border border-stone-200 text-xs text-stone-700">
                      <strong>Bản trích dẫn tư liệu gốc:</strong>
                      <p className="mt-1">{qaResponse.base_answer}</p>
                    </div>
                  )}
                </div>

                {/* Danh sách trích dẫn nguồn gốc (Citations) */}
                {qaResponse.citations.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-serif font-bold text-sm text-ink">
                      Bằng chứng & Trích dẫn nguồn gốc ({qaResponse.citations.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {qaResponse.citations.map((cite, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-forest truncate max-w-[200px]">
                              {cite.source_title}
                            </span>
                            {cite.start_time_seconds !== null && cite.start_time_seconds !== undefined && (
                              <span className="bg-forest/10 text-forest px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                                {Math.floor(cite.start_time_seconds / 60)}:
                                {(cite.start_time_seconds % 60).toString().padStart(2, "0")}
                              </span>
                            )}
                          </div>

                          <p className="text-ink-muted italic border-l-2 border-forest/40 pl-2">
                            "{cite.quote_text}"
                          </p>

                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-[11px] text-ink-muted capitalize">Nguồn: {cite.source_type}</span>
                            <Link
                              href={cite.url}
                              className="text-forest hover:underline font-medium inline-flex items-center gap-1"
                            >
                              Mở chi tiết →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 2: TÌM KIẾM ĐA MIỀN (MULTI-DOMAIN SEARCH) */}
          <section className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-xl text-ink">Tìm Kiếm Đa Miền Kho Ký Ức</h2>
              <p className="text-xs text-ink-muted">
                Quét đồng thời qua Người thân, Tư liệu âm thanh/ảnh, Câu chuyện, Dòng thời gian, Bản đồ và Cẩm nang gia truyền.
              </p>
            </div>

            {/* Thanh tìm kiếm */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên người thân, món ăn, địa danh, năm tháng hoặc từ khóa lời kể..."
                className="flex-1 px-4 py-3 border border-stone-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-forest bg-cream-50/50 shadow-inner"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="btn inline-flex items-center gap-2 bg-stone-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-medium text-sm transition-all disabled:opacity-50"
              >
                {isSearching ? "Đang tìm..." : "Tìm kiếm"}
              </button>
            </form>

            {/* Tab phân loại miền */}
            <div className="flex flex-wrap gap-2 border-b border-stone-100 pb-3">
              {DOMAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-forest text-white shadow-xs"
                      : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Danh sách kết quả tìm kiếm */}
            <div className="space-y-3">
              {hasSearched && searchResults.length === 0 && !isSearching && (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                  <h3 className="font-serif font-bold text-base text-ink">Không tìm thấy kết quả nào</h3>
                  <p className="text-xs text-ink-muted max-w-sm mx-auto">
                    Không tìm thấy dữ liệu khớp với từ khóa "{searchQuery}". Bạn có thể thử từ khóa ngắn hơn hoặc kiểm tra ở tab phân loại khác.
                  </p>
                </div>
              )}

              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="bg-stone-50/50 hover:bg-stone-50 border border-stone-200 rounded-2xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.type)}
                      <h3 className="font-serif font-bold text-base text-ink">{item.title}</h3>
                      <span className="text-[11px] text-ink-muted bg-white px-2 py-0.5 rounded border border-stone-200">
                        Khớp: {item.matched_field}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-2 max-w-2xl">{item.snippet}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {item.date_or_year && (
                      <span className="text-xs text-stone-500 font-mono">
                        {item.date_or_year}
                      </span>
                    )}
                    <Link
                      href={item.url}
                      className="btn text-xs bg-white hover:bg-forest hover:text-white text-forest border border-forest/30 px-3 py-1.5 rounded-xl font-medium transition-colors"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: AI STUDIO */}
      {activeMainTab === "ai-studio" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Banner giới thiệu AI Studio */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-forest/10 via-forest/5 to-transparent border border-forest/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-forest text-white text-[11px] font-bold">
                  Trợ lý Thông minh
                </span>
                <h2 className="font-serif font-bold text-lg text-ink">
                  Xưởng Sáng Tạo & Biên Tập Di Sản
                </h2>
              </div>
              <p className="text-xs text-ink-muted max-w-xl leading-relaxed">
                Tự động bóc tách sự kiện từ lời kể thô, tóm tắt bài học truyền đời của cha ông và chắp bút những trang hồi ký trang trọng.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-forest">Sẵn sàng hỗ trợ</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* TOOL A: BÓC TÁCH CÂU CHUYỆN & CÁC MỐC SỰ KIỆN */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-ink">
                  Bóc Tách Câu Chuyện & Mốc Niên Đại
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Nhập văn bản lời kể âm thanh hoặc ghi chép thô để AI trích xuất cấu trúc
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink">
                    Văn bản ghi âm / Lời kể thô:
                  </label>
                  <button
                    type="button"
                    onClick={() => setStoryInput("Năm 1954, gia đình tôi chuyển từ phố cổ về khu tập thể mới. Lúc đó mẹ tôi là bà Mai bắt đầu gánh bánh gối đi bán khắp các phố Hàng Bông, Hàng Gai. Mẹ luôn dặn: làm đồ ăn cho người ta thì cái tâm phải đặt lên hàng đầu, bột phải chuẩn, dầu phải sạch, không được vì lời lãi mà làm ẩu. Nhờ thế gánh bánh nuôi sống cả nhà suốt những năm tháng gian khó.")}
                    className="text-[11px] text-forest hover:underline font-medium"
                  >
                    Dán mẫu thử
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Dán lời thoại đã chép lời hoặc câu chuyện bạn muốn phân tích..."
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-2xl text-xs bg-cream-50/40 focus:ring-1 focus:ring-forest focus:outline-none leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleExtractStory}
                disabled={isExtracting || !storyInput.trim()}
                className="w-full btn bg-purple-700 hover:bg-purple-800 text-white font-medium text-xs py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <span>Đang phân tích câu chuyện...</span>
                ) : (
                  <span>Trích xuất tiêu đề, mốc niên đại & bài học</span>
                )}
              </button>

              {/* Extraction result */}
              {extractionResult && (
                <div className="mt-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3 animate-in fade-in duration-200 text-xs">
                  <div>
                    <span className="font-semibold text-purple-900">Tiêu đề đề xuất:</span>
                    <h4 className="font-serif font-bold text-sm text-ink mt-0.5">
                      {extractionResult.title}
                    </h4>
                  </div>

                  <div>
                    <span className="font-semibold text-purple-900">Tóm tắt ý nghĩa:</span>
                    <p className="text-ink-muted mt-0.5 leading-relaxed">
                      {extractionResult.summary}
                    </p>
                  </div>

                  {extractionResult.milestones?.length > 0 && (
                    <div>
                      <span className="font-semibold text-purple-900">Mốc sự kiện bóc tách:</span>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-stone-700">
                        {extractionResult.milestones.map((m: any, idx: number) => (
                          <li key={idx}>
                            <strong>{m.year ? `[Năm ${m.year}] ` : ""}{m.title}:</strong> {m.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {extractionResult.keyLessons?.length > 0 && (
                    <div>
                      <span className="font-semibold text-purple-900">Bài học cha ông truyền dạy:</span>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-stone-700">
                        {extractionResult.keyLessons.map((l: string, idx: number) => (
                          <li key={idx} className="italic">{l}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-purple-200 flex justify-end">
                    <Link
                      href={`/workspaces/${workspaceId}/stories/create`}
                      className="btn text-xs bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-xl font-medium shadow-xs"
                    >
                      Dùng dữ liệu này để tạo câu chuyện mới →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* TOOL B: CHẮP BÚT HỒI KÝ & BÀI VIẾT TRI ÂN TIỀN NHÂN */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-ink">
                  Chắp Bút Tri Ân & Ký Ức Tiền Nhân
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Sáng tác bài viết hồi ức, văn bia hoặc tưởng niệm tôn kính tiền nhân
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">
                    Chủ đề hoặc tên người thân:
                  </label>
                  <input
                    type="text"
                    value={tributeTopic}
                    onChange={(e) => setTributeTopic(e.target.value)}
                    placeholder="VD: Tri ân bà nội Lê Thị Mai - người giữ hồn ẩm thực gia đình"
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/40 focus:ring-1 focus:ring-forest focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink">
                      Ký ức & nét tính cách đáng nhớ:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTributeTopic("Tri ân bà nội Lê Thị Mai");
                        setTributeDetails("Bà sinh năm 1936 tại Hà Nội, một đời tần tảo nuôi con cháu bằng gánh hàng bánh gối. Bà luôn sống cần kiệm, bao dung, dạy con cháu sống nhân nghĩa.");
                      }}
                      className="text-[11px] text-forest hover:underline font-medium"
                    >
                      Dán mẫu thử
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={tributeDetails}
                    onChange={(e) => setTributeDetails(e.target.value)}
                    placeholder="Nhập kỷ niệm, đức tính, công lao hoặc những lời dạy của người thân..."
                    className="w-full px-3.5 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/40 focus:ring-1 focus:ring-forest focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleComposeTribute}
                disabled={isComposing || !tributeTopic.trim()}
                className="w-full btn bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isComposing ? (
                  <span>Đang chắp bút bài tri ân...</span>
                ) : (
                  <span>Chắp bút bài tri ân người thân</span>
                )}
              </button>

              {/* Tribute result */}
              {tributeResult && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3 animate-in fade-in duration-200 text-xs">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <span className="font-semibold text-amber-900 font-serif">
                      Tác phẩm tri ân hoàn thiện:
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(tributeResult)}
                      className="text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 font-medium text-amber-800"
                    >
                      Sao chép nội dung
                    </button>
                  </div>

                  <div className="text-ink text-xs leading-relaxed whitespace-pre-line font-serif">
                    {tributeResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
