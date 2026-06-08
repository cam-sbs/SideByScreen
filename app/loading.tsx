export default function HomeLoading() {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
      <div className="h-10 w-full max-w-xl animate-pulse rounded-full bg-ink-3" />

      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-44 animate-pulse rounded bg-ink-3" />
            <div className="h-4 w-56 animate-pulse rounded bg-ink-3" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-ink-3" />
            <div className="h-8 w-14 animate-pulse rounded-full bg-ink-3" />
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {([80, 88, 72, 96, 68] as const).map((w, i) => (
            <div
              key={i}
              style={{ width: w }}
              className="h-7 animate-pulse rounded-full bg-ink-3"
            />
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] animate-pulse rounded-lg border border-white/6 bg-ink-3" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-ink-3" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink-3" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
