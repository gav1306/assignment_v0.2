"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/utils/constants";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--bg)]/85 backdrop-blur-sm">
      <nav className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-[var(--accent-mint)]" />
            <span
              className="absolute inset-0 rounded-full bg-[var(--accent-mint)] opacity-40 animate-ping"
              aria-hidden
            />
          </span>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm tracking-tight"
          >
            <span className="font-medium text-foreground">pipeline</span>
            <span className="text-[var(--ink-dim)]">/</span>
            <span className="text-[var(--ink-muted)]">a-b</span>
          </Link>
          <span className="ml-2 hidden sm:inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] font-mono text-[var(--ink-dim)]">
            submission
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[13px] transition-colors ease-expo-out duration-200",
                  active
                    ? "text-foreground bg-[var(--bg-elev-2)]"
                    : "text-[var(--ink-muted)] hover:text-foreground hover:bg-[var(--bg-elev)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
