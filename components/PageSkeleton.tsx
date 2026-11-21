/** Placeholder shown the moment a tab is tapped, while the page's data loads. */
export default function PageSkeleton({ title, rows = 4 }: { title: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <header>
        <div className="h-3 w-24 animate-pulse rounded-full bg-brand-soft" />
        <h1 className="mt-2 text-3xl font-extrabold">{title}</h1>
      </header>
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="card flex items-center gap-3 p-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-brand-soft" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-brand-soft" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-sky" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
