import { ReactNode } from "react";
import { WorkspaceNavTabs } from "@/components/WorkspaceNavTabs";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <WorkspaceNavTabs workspaceId={id} />
      <div>{children}</div>
    </div>
  );
}
