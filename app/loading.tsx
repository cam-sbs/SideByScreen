export default function HomeLoading() {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
      <div className="h-10 w-full max-w-xl animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />

      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-44 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-8 w-14 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {([80, 88, 72, 96, 68] as const).map((w, i) => (
            <div
              key={i}
              style={{ width: w }}
              className="h-7 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"
            />
          ))}
        </div>

        <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="h-48 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:h-80"
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
