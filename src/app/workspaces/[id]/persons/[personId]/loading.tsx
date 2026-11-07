export default function PersonDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
      {/* Back Link Skeleton */}
      <div className="h-4 w-36 bg-stone-200 rounded" />

      {/* Profile Hero Skeleton */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-stone-200 shrink-0" />
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <div className="h-8 w-48 bg-stone-200 rounded-xl" />
            <div className="h-6 w-24 bg-stone-200 rounded-full" />
          </div>
          <div className="h-4 w-40 bg-stone-200 rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-stone-200 rounded" />
            <div className="h-3 w-4/5 bg-stone-200 rounded" />
          </div>
        </div>
      </div>

      {/* Two Columns Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <div className="h-5 w-36 bg-stone-200 rounded" />
          <div className="space-y-3">
            <div className="h-12 bg-stone-100 rounded-xl" />
            <div className="h-12 bg-stone-100 rounded-xl" />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <div className="h-5 w-48 bg-stone-200 rounded" />
          <div className="space-y-3">
            <div className="h-12 bg-stone-100 rounded-xl" />
            <div className="h-12 bg-stone-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
