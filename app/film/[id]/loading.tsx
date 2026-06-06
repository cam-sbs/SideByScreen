export default function FilmLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-48 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800 sm:h-72 lg:h-96" />

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-10">
        <div className="h-4 w-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 sm:px-6 lg:flex-row lg:gap-10 lg:px-10">
        <div className="mx-auto w-48 flex-shrink-0 sm:w-64 lg:mx-0">
          <div className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-200 shadow-lg dark:bg-zinc-800" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          <div className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />

          <div className="space-y-2">
            <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>

          <div className="flex gap-3">
            <div className="h-4 w-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>

          <div className="flex gap-2">
            {([72, 88, 64] as const).map((w, i) => (
              <div
                key={i}
                style={{ width: w }}
                className="h-6 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>

          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
