import { FooterModelTag } from "@/components/layout/footer-model-tag";
import {
  FOOTER_DATASET_LABEL,
  FOOTER_STACK_LABEL,
} from "@/components/layout/utils/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.06em] font-mono text-ink-dim">
        <span>{FOOTER_DATASET_LABEL}</span>
        <FooterModelTag />
        <span>{FOOTER_STACK_LABEL}</span>
      </div>
    </footer>
  );
}
