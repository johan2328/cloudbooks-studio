interface EditorialBlueprintProps {
  className?: string;
}

export function EditorialBlueprint({ className = "" }: EditorialBlueprintProps) {
  return (
    <svg viewBox="0 0 460 520" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="cb-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="#7c3aed" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#2563eb" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0d1629" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cb-cover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#101a32" />
          <stop offset="100%" stopColor="#0a1220" />
        </linearGradient>
        <linearGradient id="cb-spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="cb-ghost" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0e1830" />
          <stop offset="100%" stopColor="#0a1220" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <circle cx="230" cy="260" r="220" fill="url(#cb-halo)" />

      {/* Soft floor shadow under stack */}
      <ellipse cx="230" cy="470" rx="160" ry="14" fill="#000" opacity="0.35" />

      {/* Ghost volume 2 (deepest back) */}
      <g transform="translate(190 60) rotate(-3 0 200)" opacity="0.55">
        <rect x="0" y="0" width="170" height="380" rx="2" fill="url(#cb-ghost)" stroke="#ffffff" strokeOpacity="0.08" />
        <rect x="0" y="0" width="6" height="380" fill="#0d9488" fillOpacity="0.55" />
        <text x="85" y="200" textAnchor="middle" fill="#ffffff" fillOpacity="0.35" fontSize="22" fontWeight="900" fontFamily="ui-sans-serif" letterSpacing="2">AZ-104</text>
      </g>

      {/* Ghost volume 1 (closer back) */}
      <g transform="translate(120 50) rotate(-1.5 0 200)" opacity="0.78">
        <rect x="0" y="0" width="180" height="395" rx="2" fill="url(#cb-ghost)" stroke="#ffffff" strokeOpacity="0.1" />
        <rect x="0" y="0" width="6" height="395" fill="#2563eb" fillOpacity="0.7" />
        <text x="93" y="210" textAnchor="middle" fill="#ffffff" fillOpacity="0.5" fontSize="26" fontWeight="900" fontFamily="ui-sans-serif" letterSpacing="2">AZ-900</text>
      </g>

      {/* Front volume: AI-200 Visual Atlas */}
      <g transform="translate(70 40)">
        {/* Drop shadow */}
        <rect x="3" y="6" width="230" height="420" rx="3" fill="#000" opacity="0.45" />
        {/* Cover */}
        <rect x="0" y="0" width="230" height="420" rx="3" fill="url(#cb-cover)" stroke="#ffffff" strokeOpacity="0.14" />
        {/* Spine accent (violet for Visual Atlas) */}
        <rect x="0" y="0" width="9" height="420" fill="url(#cb-spine)" />
        <rect x="9" y="0" width="1" height="420" fill="#ffffff" fillOpacity="0.08" />

        {/* Inner editorial border (double line) */}
        <rect x="22" y="22" width="186" height="376" fill="none" stroke="#ffffff" strokeOpacity="0.1" />
        <rect x="26" y="26" width="178" height="368" fill="none" stroke="#ffffff" strokeOpacity="0.05" />

        {/* Top brand block */}
        <text x="115" y="56" textAnchor="middle" fill="#ffffff" fillOpacity="0.55" fontSize="9" fontWeight="700" fontFamily="ui-sans-serif" letterSpacing="4">CLOUDBOOKS</text>
        <line x1="80" y1="68" x2="150" y2="68" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.75" />
        <text x="115" y="82" textAnchor="middle" fill="#a78bfa" fillOpacity="0.7" fontSize="6.5" fontFamily="ui-monospace" letterSpacing="2.5">EDITORIAL · AZURE</text>

        {/* Cert code — the focal element */}
        <text x="115" y="206" textAnchor="middle" fill="#ffffff" fontSize="58" fontWeight="900" fontFamily="ui-sans-serif" letterSpacing="-1">AI-200</text>

        {/* Subtitle stack */}
        <line x1="65" y1="232" x2="165" y2="232" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="1" />
        <text x="115" y="252" textAnchor="middle" fill="#ffffff" fillOpacity="0.92" fontSize="11" fontWeight="800" fontFamily="ui-sans-serif" letterSpacing="2.5">AZURE AI FUNDAMENTALS</text>
        <text x="115" y="268" textAnchor="middle" fill="#ffffff" fillOpacity="0.5" fontSize="8" fontFamily="ui-sans-serif" letterSpacing="0.5">Designing &amp; implementing AI solutions</text>

        {/* Decorative editorial mark */}
        <g transform="translate(115 308)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#a78bfa" strokeOpacity="0.45" strokeWidth="0.75" />
          <circle cx="0" cy="0" r="5"  fill="none" stroke="#a78bfa" strokeOpacity="0.55" strokeWidth="0.75" />
          <circle cx="0" cy="0" r="1.6" fill="#a78bfa" />
          <line x1="-22" y1="0" x2="-12" y2="0" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75" />
          <line x1="12"  y1="0" x2="22"  y2="0" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75" />
        </g>

        {/* Format strip */}
        <g transform="translate(38 340)">
          <text x="0" y="0" fill="#ffffff" fillOpacity="0.4" fontSize="7" fontWeight="700" fontFamily="ui-monospace" letterSpacing="2">FORMATO</text>
          <text x="153" y="0" textAnchor="end" fill="#a78bfa" fillOpacity="0.9" fontSize="7" fontWeight="700" fontFamily="ui-monospace" letterSpacing="2">02 / 06</text>
          {/* 6 ticks, with 02 highlighted */}
          {[0,1,2,3,4,5].map(i => {
            const active = i === 1;
            return (
              <g key={i}>
                <rect x={i*26} y="8" width="22" height="3" rx="1"
                  fill={active ? "#a78bfa" : "#ffffff"}
                  fillOpacity={active ? 0.95 : 0.18} />
              </g>
            );
          })}
          <text x="0" y="28" fill="#ffffff" fillOpacity="0.85" fontSize="9" fontWeight="800" fontFamily="ui-sans-serif" letterSpacing="2.5">VISUAL ATLAS</text>
          <text x="153" y="28" textAnchor="end" fill="#ffffff" fillOpacity="0.35" fontSize="7" fontFamily="ui-monospace" letterSpacing="1.2">61 INFOGRAFÍAS</text>
        </g>

        {/* Bottom imprint */}
        <line x1="22" y1="384" x2="208" y2="384" stroke="#ffffff" strokeOpacity="0.08" />
        <text x="32" y="408" fill="#ffffff" fillOpacity="0.5" fontSize="7" fontFamily="ui-monospace" letterSpacing="1.5">VOL · 02</text>
        <text x="198" y="408" textAnchor="end" fill="#ffffff" fillOpacity="0.5" fontSize="7" fontFamily="ui-monospace" letterSpacing="1.5">EDITORIAL · 2026</text>
      </g>

      {/* Series caption below stack */}
      <g>
        <line x1="160" y1="492" x2="300" y2="492" stroke="#ffffff" strokeOpacity="0.12" />
        <text x="230" y="506" textAnchor="middle" fill="#ffffff" fillOpacity="0.4" fontSize="8" fontFamily="ui-monospace" letterSpacing="2.5">CLOUDBOOKS · AZURE SERIES</text>
      </g>
    </svg>
  );
}
