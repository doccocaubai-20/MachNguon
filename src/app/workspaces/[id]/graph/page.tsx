import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { GraphService } from "@/lib/server/graph.service";
import { KnowledgeGraphExplorer } from "@/components/KnowledgeGraphExplorer";

interface GraphPageProps {
  params: Promise<{ id: string }>;
}

export default async function GraphPage({ params }: GraphPageProps) {
  const { id: workspaceId } = await params;
  const userId = await getCurrentUserId();
  const db = await getDb();

  const wsService = new WorkspaceService(db);
  const graphService = new GraphService(db);

  const [workspaceData, graph, pendingClaims] = await Promise.all([
    wsService.getWorkspace(userId, workspaceId),
    graphService.getFullGraph(userId, workspaceId, [
      "confirmed",
      "unverified",
      "proposed",
    ]),
    graphService.listPendingClaims(userId, workspaceId),
  ]);

  const { workspace, currentMember } = workspaceData;

  const canApprove = ["admin", "narrator"].includes(currentMember.role);
  const canCreate = ["admin", "contributor", "narrator"].includes(currentMember.role);

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href={`/workspaces/${workspaceId}`} className="hover:text-forest transition-colors">
          ← Về kho {workspace.name}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Bản đồ tri thức</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
            Bản Đồ Tri Thức Gia Đình
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Liên kết đa chiều giữa Người, Địa điểm, Sự kiện và Kỹ năng — luôn gắn nguồn và mốc thời gian đối chiếu.
          </p>
        </div>
      </div>

      {/* Main Graph Component */}
      <KnowledgeGraphExplorer
        graph={graph}
        pendingClaims={pendingClaims}
        workspaceId={workspaceId}
        canApprove={canApprove}
        canCreate={canCreate}
      />
    </div>
  );
}
