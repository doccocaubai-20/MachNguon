"use client";

import { useTransition } from "react";
import { switchUserAction } from "@/app/workspaces/actions";
import { DEMO_USERS, UserProfile } from "@/lib/auth/mock-users";

export function UserSwitcher({ currentUser }: { currentUser: UserProfile }) {
  const [isPending, startTransition] = useTransition();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value;
    startTransition(async () => {
      await switchUserAction(newUserId);
    });
  };

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden whitespace-nowrap text-xs font-medium text-ink-muted lg:inline">Tài khoản</span>
      <select
        value={currentUser.id}
        onChange={handleSelect}
        disabled={isPending}
        aria-label="Chọn tài khoản thành viên"
        className="min-h-10 w-full min-w-0 max-w-64 cursor-pointer truncate rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-forest shadow-2xs"
      >
        {DEMO_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName}
          </option>
        ))}
      </select>
      {isPending && <span role="status" className="sr-only">Đang chuyển tài khoản</span>}
    </div>
  );
}
