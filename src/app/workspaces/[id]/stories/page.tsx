import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { StoryService } from "@/lib/server/story.service";
import { hasPermission } from "@/lib/server/permissions";
import { StoryFilterView } from "./StoryFilterView";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function StoriesListPage({ params, searchParams }: Props) {
  const { id: workspaceId } = await params;
  const { status: statusFilter } = await searchParams;

  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const storyService = new StoryService(db);

  let workspaceData;
  try {
    workspaceData = await wsService.getWorkspace(currentUser.id, workspaceId);
  } catch (err: any) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">Bạn không có quyền truy cập câu chuyện trong kho gia đình này.</p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const canPropose = hasPermission(currentMember.role, "story:propose");

  // Lấy toàn bộ danh sách câu chuyện để chuyển đổi tab tức thì 0ms
  const stories = await storyService.listStories(currentUser.id, workspaceId);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <span className="text-ink font-medium">Câu chuyện có nguồn</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Câu Chuyện Có Nguồn</h1>
          <p className="text-sm text-ink-muted mt-1">
            Mỗi câu chuyện đều gắn liền với lời kể âm thanh gốc và phải được người kể trực tiếp phê duyệt.
          </p>
        </div>

        {canPropose && (
          <Link
            href={`/workspaces/${workspace.id}/stories/create`}
            className="btn inline-flex items-center gap-2 bg-forest hover:bg-forest-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            + Biên soạn câu chuyện mới
          </Link>
        )}
      </div>

      {/* Filter Tabs & Stories List chuyển đổi tức thì */}
      <StoryFilterView
        initialStories={stories}
        workspaceId={workspace.id}
        initialStatusFilter={statusFilter}
      />
    </div>
  );
}
