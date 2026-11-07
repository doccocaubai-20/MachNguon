export default function MembersLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-stone-200 rounded" />
          <div className="h-8 w-64 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-stone-200 rounded" />
        </div>
      </div>

      {/* Invite Member Box Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="h-5 w-44 bg-stone-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-10 bg-stone-100 rounded-xl" />
          <div className="h-10 bg-stone-100 rounded-xl" />
          <div className="h-10 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* Members Table Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="h-5 w-40 bg-stone-200 rounded" />
          <div className="h-4 w-20 bg-stone-200 rounded" />
        </div>
        <div className="divide-y divide-stone-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                  <div className="h-3 w-44 bg-stone-200 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-28 bg-stone-200 rounded-xl" />
                <div className="h-8 w-16 bg-stone-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
