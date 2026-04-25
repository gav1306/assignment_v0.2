import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import { FooterModelTag } from "@/components/footer-model-tag";
import { SiteNav } from "@/components/site-nav";

import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pipeline A/B — Baseline vs Solution",
  description:
    "Side-by-side comparison of baseline and optimized SQL analytics pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>
          <SiteNav />
          <main className="flex-1 mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10 py-12">
            {children}
          </main>
          <footer className="border-t border-border">
            <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.06em] font-mono text-[var(--ink-dim)]">
              <span>gaming · mental health dataset</span>
              <FooterModelTag />
              <span>SSE · FastAPI · Next.js</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
