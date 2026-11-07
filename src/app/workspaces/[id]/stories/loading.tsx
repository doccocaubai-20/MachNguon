export default function StoriesLoading() {
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

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-1.5 p-1 bg-cream-100 rounded-xl w-fit">
        <div className="h-7 w-20 bg-stone-200 rounded-lg" />
        <div className="h-7 w-24 bg-stone-200 rounded-lg" />
        <div className="h-7 w-24 bg-stone-200 rounded-lg" />
      </div>

      {/* Stories List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-28 bg-stone-200 rounded-full" />
              <div className="h-4 w-20 bg-stone-200 rounded" />
            </div>
            <div className="h-6 w-2/3 bg-stone-200 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-4/5 bg-stone-200 rounded" />
            </div>
            <div className="h-10 bg-stone-100 rounded-xl border border-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
