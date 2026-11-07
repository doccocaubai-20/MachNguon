export default function ManualDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
      {/* Back Link Skeleton */}
      <div className="h-4 w-36 bg-stone-200 rounded" />

      {/* Manual Header Skeleton */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-stone-200 rounded-full" />
          <div className="h-6 w-28 bg-stone-200 rounded-full" />
        </div>
        <div className="h-8 w-3/4 bg-stone-200 rounded-xl" />
        <div className="h-4 w-64 bg-stone-200 rounded" />
      </div>

      {/* Ingredients Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="h-5 w-48 bg-stone-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-stone-50 rounded-xl border border-stone-100" />
          ))}
        </div>
      </div>

      {/* Steps Timeline Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="h-5 w-44 bg-stone-200 rounded" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-stone-50 rounded-xl space-y-2">
              <div className="h-4 w-32 bg-stone-200 rounded" />
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-4/5 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
