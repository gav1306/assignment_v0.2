import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="font-semibold text-sm tracking-tight">
          Pipeline A/B
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            Compare
          </Link>
          <Link
            href="/history"
            className="px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            History
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            Chat
          </Link>
        </div>
      </nav>
    </header>
  );
}
