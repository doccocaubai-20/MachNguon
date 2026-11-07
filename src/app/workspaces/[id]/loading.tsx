export default function WorkspaceLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 bg-stone-200 rounded" />
        <span className="text-stone-300">/</span>
        <div className="h-4 w-32 bg-stone-200 rounded" />
      </div>

      {/* Workspace Header Skeleton */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl w-full">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-stone-200 rounded-xl" />
            <div className="h-6 w-28 bg-stone-200 rounded-full" />
          </div>
          <div className="h-4 w-full max-w-md bg-stone-200 rounded" />
          <div className="h-3 w-48 bg-stone-200 rounded" />
        </div>
        <div className="h-10 w-36 bg-stone-200 rounded-xl shrink-0" />
      </div>

      {/* Grid Features Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-stone-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-stone-200 p-6 rounded-3xl space-y-4"
            >
              <div className="h-6 w-28 bg-stone-200 rounded-lg" />
              <div className="h-5 w-44 bg-stone-200 rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-stone-200 rounded" />
                <div className="h-3 w-3/4 bg-stone-200 rounded" />
              </div>
              <div className="h-4 w-20 bg-stone-200 rounded pt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
