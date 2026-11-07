export default function AssetsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-stone-200 rounded" />
          <div className="h-8 w-56 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-stone-200 rounded" />
        </div>
        <div className="h-10 w-36 bg-stone-200 rounded-xl shrink-0" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-1.5 p-1 bg-cream-100 rounded-xl w-fit">
        <div className="h-7 w-20 bg-stone-200 rounded-lg" />
        <div className="h-7 w-32 bg-stone-200 rounded-lg" />
        <div className="h-7 w-20 bg-stone-200 rounded-lg" />
        <div className="h-7 w-24 bg-stone-200 rounded-lg" />
      </div>

      {/* Assets Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 bg-stone-200 rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-40 bg-stone-200 rounded" />
                  <div className="h-3 w-28 bg-stone-200 rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-stone-200 rounded-full" />
            </div>

            <div className="h-12 bg-stone-100 rounded-xl border border-stone-200" />

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="h-3 w-32 bg-stone-200 rounded" />
              <div className="h-3 w-16 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
