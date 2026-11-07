export default function GraphLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-stone-200 rounded" />
          <div className="h-8 w-64 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-stone-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 bg-stone-200 rounded-xl" />
          <div className="h-10 w-36 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <div className="h-8 w-32 bg-stone-200 rounded-xl" />
        <div className="h-8 w-36 bg-stone-200 rounded-xl" />
        <div className="h-8 w-36 bg-stone-200 rounded-xl" />
      </div>

      {/* Canvas Skeleton */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-stone-200 rounded" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-stone-200 rounded-full" />
            <div className="h-6 w-16 bg-stone-200 rounded-full" />
            <div className="h-6 w-16 bg-stone-200 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-stone-200 mx-auto" />
            <div className="h-4 w-48 bg-stone-200 rounded mx-auto" />
          </div>
        </div>
        <div className="h-8 w-full max-w-sm bg-stone-100 rounded-xl mx-auto" />
      </div>
    </div>
  );
}
