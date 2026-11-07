import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { WorkspaceService } from "@/lib/server/workspace.service";
import SearchClient from "./SearchClient";

interface SearchPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id: workspaceId } = await params;
  const currentUser = await getCurrentUser();
  const db = await getDb();
  const wsService = new WorkspaceService(db);

  let workspaceDetail;
  try {
    workspaceDetail = await wsService.getWorkspace(currentUser.id, workspaceId);
  } catch {
    notFound();
  }

  return (
    <SearchClient
      workspaceId={workspaceId}
      workspaceName={workspaceDetail.workspace.name}
    />
  );
}
