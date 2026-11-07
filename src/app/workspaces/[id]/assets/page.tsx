import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import { AssetService } from "@/lib/server/asset.service";
import { PersonService } from "@/lib/server/person.service";
import { hasPermission } from "@/lib/server/permissions";
import { AudioRecorder } from "@/components/AudioRecorder";
import { FileUploadModal } from "@/components/FileUploadModal";
import { AssetsFilterView } from "./AssetsFilterView";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; q?: string }>;
}

export default async function AssetsPage({ params, searchParams }: Props) {
  const { id: workspaceId } = await params;
  const { type: typeFilter, q: queryFilter } = await searchParams;

  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);
  const assetService = new AssetService(db);
  const personService = new PersonService(db);

  let workspaceData;
  let persons: Awaited<ReturnType<PersonService["listPersons"]>> = [];
  let assets: Awaited<ReturnType<AssetService["listAssets"]>> = [];

  try {
    const [wsData, personsData, assetsData] = await Promise.all([
      wsService.getWorkspace(currentUser.id, workspaceId),
      personService.listPersons(currentUser.id, workspaceId),
      assetService.listAssets(currentUser.id, workspaceId, { keyword: queryFilter }),
    ]);
    workspaceData = wsData;
    persons = personsData;
    assets = assetsData;
  } catch (err: any) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
          Quyền truy cập
        </span>
        <h2 className="font-serif font-bold text-xl text-ink">Truy cập bị từ chối</h2>
        <p className="text-sm text-ink-muted">Bạn không có quyền truy cập kho tư liệu gia đình này.</p>
        <Link href="/workspaces" className="btn inline-flex px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium">
          ← Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  const { workspace, currentMember } = workspaceData;
  const canUpload = hasPermission(currentMember.role, "asset:upload");
  const isAdmin = currentMember.role === "admin";
  const narratorsList = persons.map((p) => ({ id: p.id, fullName: p.full_name }));

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/workspaces" className="hover:text-forest">Kho gia đình</Link>
        <span>/</span>
        <Link href={`/workspaces/${workspace.id}`} className="hover:text-forest">{workspace.name}</Link>
        <span>/</span>
        <span className="text-ink font-medium">Kho tư liệu gốc</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">Kho Tư Liệu Gốc</h1>
          <p className="text-sm text-ink-muted mt-1">
            Lưu trữ nguyên vẹn các tệp âm thanh giọng kể, hình ảnh thực tế và tài liệu chép tay của gia đình.
          </p>
        </div>

        {canUpload && (
          <div className="flex items-center gap-3">
            <FileUploadModal workspaceId={workspace.id} narrators={narratorsList} />
          </div>
        )}
      </div>

      {/* Section Ghi âm trực tiếp */}
      {canUpload && (
        <AudioRecorder workspaceId={workspace.id} narrators={narratorsList} />
      )}

      {/* Danh mục Tư liệu & Bộ lọc chuyển tab tức thì */}
      <AssetsFilterView
        initialAssets={assets}
        workspaceId={workspace.id}
        currentUserId={currentUser.id}
        isAdmin={isAdmin}
        initialTypeFilter={typeFilter}
      />
    </div>
  );
}
