interface EditorialBlueprintProps {
  className?: string;
}

export function EditorialBlueprint({ className = "" }: EditorialBlueprintProps) {
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <div className="absolute -inset-6 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 pointer-events-none" aria-hidden />

      <div className="absolute inset-2 rounded-full overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(124,58,237,0.35)]">
        <img
          src="/hero-volume-still.png"
          alt="Volumen editorial CloudBooks"
          className="w-full h-full object-cover scale-105"
          draggable={false}
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.04] rounded-full pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 35%, transparent 55%, rgba(13,22,41,0.55) 100%)",
          }}
        />
      </div>

      <div className="absolute top-[6%] right-[8%] w-10 h-10 rounded-full bg-white/[0.04] ring-1 ring-white/15 backdrop-blur-sm flex items-center justify-center pointer-events-none">
        <div className="w-1 h-1 rounded-full bg-amber-300/80" />
      </div>
      <div className="absolute bottom-[10%] left-[4%] w-5 h-5 rounded-full bg-white/[0.03] ring-1 ring-white/10 pointer-events-none" />

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0d1629] rounded-sm ring-1 ring-white/[0.08] pointer-events-none">
        <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/45 whitespace-nowrap">
          Editorial · Azure series
        </span>
      </div>
    </div>
  );
}
