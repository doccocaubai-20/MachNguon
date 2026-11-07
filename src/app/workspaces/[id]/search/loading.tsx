export default function SearchLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl mx-auto">
      {/* Search Header Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-stone-200 rounded" />
        <div className="h-8 w-64 bg-stone-200 rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-stone-200 rounded" />
      </div>

      {/* Main Tabs Skeleton */}
      <div className="flex border-b border-stone-200 gap-8 pb-3">
        <div className="h-6 w-36 bg-stone-200 rounded" />
        <div className="h-6 w-40 bg-stone-200 rounded" />
      </div>

      {/* Search Box Skeleton */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="h-6 w-48 bg-stone-200 rounded" />
        <div className="h-12 bg-stone-100 rounded-2xl border border-stone-200" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-stone-200 rounded" />
          <div className="h-9 w-28 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* Domain Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-stone-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
