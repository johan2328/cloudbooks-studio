import type { ReactNode } from "react";

interface SiteFooterProps {
  right?: ReactNode;
  className?: string;
}

export function SiteFooter({ right, className = "" }: SiteFooterProps) {
  return (
    <footer className={`relative bg-[#0d1629] border-t border-white/[0.06] overflow-hidden ${className}`}>
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 0.5px, transparent 0.5px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute -left-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-[0.06] bg-blue-600 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -right-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-[0.06] bg-violet-600 pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-5 md:gap-4">
          <div
            className="hidden md:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-blue-500/20 via-white/[0.08] to-violet-500/20 pointer-events-none"
            aria-hidden
          />
          <div
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 ring-1 ring-blue-500/40 bg-[#0d1629] pointer-events-none"
            aria-hidden
          />
          <div
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 ring-1 ring-violet-500/40 bg-[#0d1629] pointer-events-none"
            aria-hidden
          />

          <div className="relative z-10 flex items-center gap-3 bg-[#0d1629] pr-0 md:pr-5">
            <div className="relative px-2.5 py-1.5 rounded-sm ring-1 ring-white/[0.07] bg-[#0a1220]">
              <div className="absolute -top-px left-2 right-2 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
              <img
                src="/cloudbooks-logo-nobg.png"
                alt="CloudBooks"
                className="h-12 w-auto"
                draggable={false}
              />
            </div>
            <span className="hidden sm:inline text-[10px] text-white/35 max-w-[14rem] leading-snug">
              Editorial inteligente de certificaciones cloud
            </span>
          </div>

          <div className="relative z-10 flex items-center bg-[#0d1629] pl-0 md:pl-5">
            {right}
          </div>
        </div>
      </div>
    </footer>
  );
}
