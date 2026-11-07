"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  GraphEntity,
  GraphEdgeWithNames,
  FullGraphView,
  EntityType,
} from "@/contracts/graph.contract";
import { confirmClaimAction, rejectClaimAction } from "@/app/workspaces/[id]/graph/actions";

interface KnowledgeGraphExplorerProps {
  graph: FullGraphView;
  pendingClaims: GraphEdgeWithNames[];
  workspaceId: string;
  canApprove: boolean;
  canCreate: boolean;
}

const TYPE_CONFIG: Record<
  EntityType,
  { label: string; color: string; bg: string; border: string; initial: string }
> = {
  person: {
    label: "Người",
    color: "text-forest",
    bg: "bg-forest",
    border: "border-forest",
    initial: "P",
  },
  place: {
    label: "Địa điểm",
    color: "text-terracotta",
    bg: "bg-terracotta",
    border: "border-terracotta",
    initial: "L",
  },
  event: {
    label: "Sự kiện",
    color: "text-amber-700",
    bg: "bg-amber-600",
    border: "border-amber-600",
    initial: "E",
  },
  skill: {
    label: "Kỹ năng & Bí quyết",
    color: "text-indigo-700",
    bg: "bg-indigo-600",
    border: "border-indigo-600",
    initial: "S",
  },
};

export function KnowledgeGraphExplorer({
  graph,
  pendingClaims,
  workspaceId,
  canApprove,
  canCreate,
}: KnowledgeGraphExplorerProps) {
  const [activeTab, setActiveTab] = useState<"canvas" | "pending" | "entities">("canvas");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    graph.nodes.length > 0 ? graph.nodes[0].id : null
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate layout coordinates for nodes on 800x520 canvas
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const n = graph.nodes.length;
    if (n === 0) return map;

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    graph.nodes.forEach((node, i) => {
      // Golden angle / circular distribution
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      map.set(node.id, { x, y });
    });

    return map;
  }, [graph.nodes]);

  // Selected node details and 1-hop connected edges
  const selectedNode = useMemo(() => {
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graph.nodes, selectedNodeId]);

  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return graph.edges.filter(
      (e) => e.source_entity_id === selectedNodeId || e.target_entity_id === selectedNodeId
    );
  }, [graph.edges, selectedNodeId]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNodeId) return ids;
    ids.add(selectedNodeId);
    connectedEdges.forEach((e) => {
      ids.add(e.source_entity_id);
      ids.add(e.target_entity_id);
    });
    return ids;
  }, [selectedNodeId, connectedEdges]);

  // Filtered nodes for the entities table
  const filteredEntities = useMemo(() => {
    return graph.nodes.filter((node) => {
      if (filterType !== "all" && node.entity_type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = node.name.toLowerCase().includes(q);
        const matchDesc = node.description?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [graph.nodes, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-cream-100 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "canvas"
                ? "bg-white text-forest shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Bản đồ trực quan & Lân cận
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-white text-forest shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <span>Duyệt đề xuất</span>
            {pendingClaims.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-terracotta text-white text-[10px] flex items-center justify-center font-bold">
                {pendingClaims.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("entities")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "entities"
                ? "bg-white text-forest shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Danh mục nút ({graph.nodes.length})
          </button>
        </div>

        {/* Action Buttons */}
        {canCreate && (
          <div className="flex items-center gap-2">
            <Link
              href={`/workspaces/${workspaceId}/graph/entities/create`}
              className="btn inline-flex items-center gap-1.5 bg-cream-100 hover:bg-cream-200 text-ink border border-cream-200 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <span>+</span> Thêm nút tri thức
            </Link>
            <Link
              href={`/workspaces/${workspaceId}/graph/claims/create`}
              className="btn inline-flex items-center gap-1.5 bg-forest hover:bg-forest-hover text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm"
            >
              <span>+</span> Thêm liên kết (Claim)
            </Link>
          </div>
        )}
      </div>

      {/* TAB 1: VISUAL GRAPH CANVAS & INSPECTOR */}
      {activeTab === "canvas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive SVG Canvas */}
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-4 shadow-sm flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-stone-100 text-xs">
              <span className="font-semibold text-ink">
                Mạng lưới liên kết ({graph.nodes.length} nút, {graph.edges.length} liên kết)
              </span>
              <span className="text-ink-muted text-[11px]">
                Bấm vào một nút để xem quan hệ lân cận
              </span>
            </div>

            <div className="relative w-full aspect-[16/10] max-h-[500px] flex items-center justify-center bg-cream-50/40 rounded-2xl overflow-hidden mt-3">
              <svg viewBox="0 0 800 500" className="w-full h-full select-none">
                <defs>
                  {/* Arrow marker for edges */}
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="24"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#78716c" opacity="0.7" />
                  </marker>
                  <marker
                    id="arrowhead-highlight"
                    markerWidth="8"
                    markerHeight="6"
                    refX="26"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#214E43" />
                  </marker>
                </defs>

                {/* Edges */}
                {graph.edges.map((edge) => {
                  const src = nodePositions.get(edge.source_entity_id);
                  const tgt = nodePositions.get(edge.target_entity_id);
                  if (!src || !tgt) return null;

                  const isConnected =
                    edge.source_entity_id === selectedNodeId ||
                    edge.target_entity_id === selectedNodeId;
                  const isPending = edge.status === "proposed" || edge.status === "unverified";

                  return (
                    <g key={edge.id} className="transition-opacity duration-300">
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={isConnected ? "#214E43" : "#d6d3d1"}
                        strokeWidth={isConnected ? 2.5 : 1.2}
                        strokeDasharray={isPending ? "4 4" : undefined}
                        opacity={selectedNodeId ? (isConnected ? 1 : 0.15) : 0.6}
                        markerEnd={isConnected ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                      />
                      {/* Edge Label on midpoint */}
                      <text
                        x={(src.x + tgt.x) / 2}
                        y={(src.y + tgt.y) / 2 - 4}
                        fill={isConnected ? "#214E43" : "#78716c"}
                        fontSize="9"
                        fontWeight={isConnected ? "bold" : "normal"}
                        textAnchor="middle"
                        opacity={selectedNodeId ? (isConnected ? 1 : 0.1) : 0.7}
                        className="pointer-events-none"
                      >
                        {edge.relation_type}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {graph.nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isSelected = node.id === selectedNodeId;
                  const isConnected = connectedNodeIds.has(node.id);
                  const cfg = TYPE_CONFIG[node.entity_type];

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer transition-transform duration-200 hover:scale-105"
                      opacity={selectedNodeId ? (isConnected ? 1 : 0.25) : 1}
                    >
                      {/* Outer Ring when selected */}
                      {isSelected && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={28}
                          fill="none"
                          stroke="#214E43"
                          strokeWidth="2.5"
                          strokeDasharray="3 3"
                          className="animate-spin-slow origin-center"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={20}
                        fill={isSelected ? "#214E43" : "#ffffff"}
                        stroke={isSelected ? "#214E43" : "#a8a29e"}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="shadow-sm filter drop-shadow-sm"
                      />

                      {/* Node Icon */}
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        fontSize="12"
                        fontWeight="bold"
                        fill={isSelected ? "#ffffff" : "#214E43"}
                        textAnchor="middle"
                        className="pointer-events-none font-mono"
                      >
                        {cfg.initial}
                      </text>

                      {/* Node Name Label */}
                      <text
                        x={pos.x}
                        y={pos.y + 34}
                        fontSize="11"
                        fontWeight={isSelected ? "bold" : "500"}
                        fill="#1F2933"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {node.name.length > 18 ? `${node.name.substring(0, 16)}...` : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Type Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-stone-100 text-[11px] text-ink-muted">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.bg}`}></span>
                  <span className="font-medium text-ink">{cfg.label} ({cfg.initial})</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-stone-200">
                <span className="w-4 h-0.5 bg-stone-400 inline-block"></span>
                <span>Đã xác nhận</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-b border-dashed border-terracotta inline-block"></span>
                <span>Đang chờ duyệt</span>
              </div>
            </div>
          </div>

          {/* Inspector Panel (Chi tiết nút được chọn) */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            {selectedNode ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        TYPE_CONFIG[selectedNode.entity_type].color
                      } bg-cream-100 border-cream-200`}
                    >
                      {TYPE_CONFIG[selectedNode.entity_type].label}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {connectedEdges.length} liên kết lân cận
                    </span>
                  </div>

                  <h2 className="font-serif font-bold text-xl text-ink">{selectedNode.name}</h2>

                  {selectedNode.aliases && selectedNode.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.aliases.map((a, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-stone-100 text-ink-muted px-2 py-0.5 rounded-md"
                        >
                          Tên gọi: {a}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedNode.description && (
                    <p className="text-xs text-ink-muted leading-relaxed pt-1">
                      {selectedNode.description}
                    </p>
                  )}
                </div>

                {/* Connected Claims / Edges */}
                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <div className="text-xs font-semibold text-ink flex items-center justify-between">
                    <span>Mối liên hệ & Lời khẳng định có nguồn:</span>
                  </div>

                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-ink-muted italic py-2">
                      Chưa có liên kết nào kết nối trực tiếp với nút này.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {connectedEdges.map((edge) => {
                        const isSource = edge.source_entity_id === selectedNode.id;
                        const otherName = isSource ? edge.target_name : edge.source_name;
                        const otherType = isSource ? edge.target_type : edge.source_type;

                        return (
                          <div
                            key={edge.id}
                            className="bg-cream-50/70 border border-stone-200 rounded-2xl p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 font-semibold text-ink">
                                <span>{isSource ? "→" : "←"}</span>
                                <span className="text-forest uppercase tracking-wider text-[10px] bg-forest/10 px-1.5 py-0.5 rounded">
                                  {edge.relation_type}
                                </span>
                                <span className="truncate">{otherName}</span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  edge.status === "confirmed"
                                    ? "bg-forest/10 text-forest"
                                    : "bg-terracotta/10 text-terracotta"
                                }`}
                              >
                                {edge.status === "confirmed" ? "Đã duyệt" : "Chờ duyệt"}
                              </span>
                            </div>

                            <p className="text-ink-muted text-[11px] leading-relaxed">
                              &ldquo;{edge.statement}&rdquo;
                            </p>

                            {/* Evidence Quote & Asset Link */}
                            {edge.evidence_quote && (
                              <div className="bg-white border border-stone-200 rounded-xl p-2.5 mt-1 space-y-1">
                                <div className="text-[10px] font-semibold text-ink flex items-center gap-1">
                                  <span>Bằng chứng gốc:</span>
                                  {edge.start_time_seconds != null && (
                                    <span className="text-forest">
                                      ({edge.start_time_seconds}s - {edge.end_time_seconds}s)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-ink-muted italic">
                                  {edge.evidence_quote}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-ink-muted text-xs">
                Chọn một nút trên bản đồ để xem chi tiết liên kết và bằng chứng gốc.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING CLAIMS APPROVAL */}
      {activeTab === "pending" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-ink">
              Màn Hình Phê Duyệt Đề Xuất Liên Kết (Pending Claims)
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Các liên kết do thành viên hoặc AI đề xuất trích xuất từ giọng kể cần được Người kể
              (Narrator) hoặc Quản trị viên (Admin) thẩm định xác nhận trước khi đưa vào đồ thị chính thức.
            </p>
          </div>

          {pendingClaims.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl">
              <p className="text-sm font-serif font-bold text-ink">Không có đề xuất nào đang chờ duyệt</p>
              <p className="text-xs text-ink-muted mt-1">
                Tất cả các mối quan hệ tri thức hiện tại đã được xác nhận đầy đủ.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-cream-50/50 border border-stone-200 hover:border-forest/40 rounded-2xl p-5 shadow-sm space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-ink">{claim.source_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-forest/10 text-forest font-bold uppercase tracking-wider">
                        {claim.relation_type}
                      </span>
                      <span className="font-semibold text-sm text-ink">{claim.target_name}</span>
                    </div>

                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium self-start sm:self-auto">
                      Đang chờ duyệt xác nhận
                    </span>
                  </div>

                  <p className="text-sm text-ink font-medium leading-relaxed">
                    &ldquo;{claim.statement}&rdquo;
                  </p>

                  {/* Evidence Citation */}
                  {claim.evidence_quote && (
                    <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="font-semibold text-ink flex items-center gap-1.5 text-[11px]">
                        <span>Đoạn trích âm thanh đối chiếu:</span>
                        {claim.start_time_seconds != null && (
                          <span className="text-forest font-mono">
                            [{claim.start_time_seconds}s - {claim.end_time_seconds}s]
                          </span>
                        )}
                        {claim.evidence_asset_title && (
                          <span className="text-ink-muted truncate">
                            • {claim.evidence_asset_title}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-muted italic leading-relaxed">
                        &ldquo;{claim.evidence_quote}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Approval Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-200">
                    <form action={rejectClaimAction}>
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <button
                        type="submit"
                        disabled={!canApprove}
                        className="btn bg-white hover:bg-stone-100 text-red-600 border border-stone-300 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </form>

                    <form action={confirmClaimAction}>
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <button
                        type="submit"
                        disabled={!canApprove}
                        className="btn bg-forest hover:bg-forest-hover text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                      >
                        Xác nhận liên kết này
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ENTITY DIRECTORY TABLE */}
      {activeTab === "entities" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-ink">Danh Mục Nút Thực Thể Tri Thức</h2>
              <p className="text-xs text-ink-muted mt-1">
                Các đối tượng Người, Địa điểm, Sự kiện và Kỹ năng được quản lý trong kho gia đình.
              </p>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Tìm kiếm nút..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-cream-50 focus:outline-none focus:ring-1 focus:ring-forest"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-stone-300 rounded-xl text-xs bg-cream-50 focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
              >
                <option value="all">Tất cả phân loại</option>
                <option value="person">Người thân</option>
                <option value="place">Địa điểm</option>
                <option value="event">Sự kiện</option>
                <option value="skill">Kỹ năng & Bí quyết</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 text-ink-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Phân loại</th>
                  <th className="px-4 py-3">Tên nút</th>
                  <th className="px-4 py-3">Tên gọi khác / Biệt danh</th>
                  <th className="px-4 py-3">Mô tả tóm tắt</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredEntities.map((entity) => {
                  const cfg = TYPE_CONFIG[entity.entity_type];
                  return (
                    <tr key={entity.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${cfg.color} bg-cream-100`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.bg}`}></span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink text-sm">
                        {entity.name}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {entity.aliases && entity.aliases.length > 0
                          ? entity.aliases.join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-muted max-w-xs truncate">
                        {entity.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedNodeId(entity.id);
                            setActiveTab("canvas");
                          }}
                          className="text-forest hover:underline font-medium"
                        >
                          Xem trên bản đồ →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
