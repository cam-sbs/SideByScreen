export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 lg:px-16">
      <main className="w-full max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-center sm:text-4xl lg:text-5xl">
          SideByScreen
        </h1>
        <p className="text-center text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Le projet est correctement initialisé avec Next.js et Tailwind CSS.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["Next.js", "Tailwind CSS", "TypeScript"].map((tech) => (
            <div
              key={tech}
              className="rounded-lg border border-zinc-200 p-6 text-center transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <h2 className="text-lg font-semibold sm:text-xl">{tech}</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Configuré et fonctionnel
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
