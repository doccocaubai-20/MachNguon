export default function ManualsLoading() {
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

      {/* Grid Manuals Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-stone-200 rounded-full" />
              <div className="h-5 w-20 bg-stone-200 rounded-full" />
            </div>
            <div className="h-6 w-3/4 bg-stone-200 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-4/5 bg-stone-200 rounded" />
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="h-4 w-28 bg-stone-200 rounded" />
              <div className="h-4 w-16 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
