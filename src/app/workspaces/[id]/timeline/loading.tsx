export default function TimelineLoading() {
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

      {/* Filter Bar Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-36 bg-stone-200 rounded-xl" />
          <div className="h-9 w-36 bg-stone-200 rounded-xl" />
          <div className="h-9 w-48 bg-stone-200 rounded-xl" />
          <div className="h-9 w-28 bg-stone-200 rounded-xl" />
        </div>
        <div className="h-4 w-24 bg-stone-200 rounded" />
      </div>

      {/* Timeline Stream Skeleton */}
      <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative">
            {/* Axis Node */}
            <div className="absolute -left-6 sm:-left-10 w-6 sm:w-10 h-6 sm:h-10 rounded-full bg-stone-200" />

            {/* Event Card Skeleton */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm ml-2 sm:ml-4 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-20 bg-stone-200 rounded" />
                  <div className="h-5 w-24 bg-stone-200 rounded-full" />
                </div>
                <div className="h-4 w-16 bg-stone-200 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-stone-200 rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-stone-200 rounded" />
                <div className="h-3 w-5/6 bg-stone-200 rounded" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-5 w-28 bg-stone-200 rounded-full" />
                <div className="h-5 w-24 bg-stone-200 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
