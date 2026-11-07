export default function PersonsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-stone-200 rounded" />
          <div className="h-8 w-64 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-stone-200 rounded" />
        </div>
        <div className="h-10 w-44 bg-stone-200 rounded-xl shrink-0" />
      </div>

      {/* Generation Filter Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="h-7 w-20 bg-stone-200 rounded-full" />
        <div className="h-7 w-28 bg-stone-200 rounded-full" />
        <div className="h-7 w-28 bg-stone-200 rounded-full" />
        <div className="h-7 w-28 bg-stone-200 rounded-full" />
      </div>

      {/* Persons Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-stone-200 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-stone-200 rounded" />
                <div className="h-3 w-24 bg-stone-200 rounded" />
                <div className="h-4 w-20 bg-stone-200 rounded-full" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-2/3 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
