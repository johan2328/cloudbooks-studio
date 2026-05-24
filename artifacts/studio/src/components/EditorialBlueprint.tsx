interface EditorialBlueprintProps {
  className?: string;
}

const LAYERS = [
  { y: -84, color: "#14b8a6", label: "Calidad",     code: "QA · PRODUCTION" },
  { y: 0,   color: "#7c3aed", label: "Creación",    code: "EDITORIAL · VISUAL" },
  { y: 84,  color: "#2563eb", label: "Conocimiento", code: "GROUNDING · PEDAGOGY" },
] as const;

export function EditorialBlueprint({ className = "" }: EditorialBlueprintProps) {
  const cx = 240;
  const cy = 240;
  const halfW = 132;
  const halfH = 34;

  return (
    <svg viewBox="0 0 540 480" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="eb-halo" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#2563eb" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0d1629" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="eb-bus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fbbf24" stopOpacity="0.7" />
          <stop offset="18%" stopColor="#14b8a6" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6" />
          <stop offset="85%" stopColor="#2563eb" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <circle cx={cx} cy={cy} r="200" fill="url(#eb-halo)" />

      {/* Backdrop tick grid */}
      <g stroke="#ffffff" strokeOpacity="0.04" strokeWidth="0.5">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 48} x2="480" y2={i * 48} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48} y2="480" />
        ))}
      </g>

      {/* Corner registration marks (blueprint feel) */}
      {[
        [24, 24], [456, 24], [24, 456], [456, 456],
      ].map(([x, y], i) => (
        <g key={`reg${i}`} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75">
          <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
          <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
        </g>
      ))}

      {/* PCB vertical bus through column */}
      <line x1={cx} y1={cy - 160} x2={cx} y2={cy + 160} stroke="url(#eb-bus)" strokeWidth="1.25" strokeDasharray="2 4" />

      {/* Isometric planes */}
      {LAYERS.map((p) => {
        const py = cy + p.y;
        const top    = `${cx},${py - halfH}`;
        const right  = `${cx + halfW},${py}`;
        const bottom = `${cx},${py + halfH}`;
        const left   = `${cx - halfW},${py}`;
        return (
          <g key={p.label}>
            {/* Subtle drop shadow plane */}
            <polygon
              points={`${cx},${py - halfH + 6} ${cx + halfW},${py + 6} ${cx},${py + halfH + 6} ${cx - halfW},${py + 6}`}
              fill="#000000"
              fillOpacity="0.18"
            />
            {/* Plane */}
            <polygon
              points={`${top} ${right} ${bottom} ${left}`}
              fill={p.color}
              fillOpacity="0.06"
              stroke={p.color}
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            {/* Internal cross */}
            <line x1={cx} y1={py - halfH} x2={cx} y2={py + halfH} stroke={p.color} strokeOpacity="0.22" strokeWidth="0.5" />
            <line x1={cx - halfW} y1={py} x2={cx + halfW} y2={py} stroke={p.color} strokeOpacity="0.22" strokeWidth="0.5" />
            {/* Inner secondary diamond */}
            <polygon
              points={`${cx},${py - halfH * 0.5} ${cx + halfW * 0.5},${py} ${cx},${py + halfH * 0.5} ${cx - halfW * 0.5},${py}`}
              fill="none"
              stroke={p.color}
              strokeOpacity="0.25"
              strokeWidth="0.5"
              strokeDasharray="1.5 2"
            />
            {/* Center node */}
            <circle cx={cx} cy={py} r="3.5" fill={p.color} />
            <circle cx={cx} cy={py} r="7" fill={p.color} fillOpacity="0.18" />

            {/* Vertex dots */}
            <circle cx={cx + halfW} cy={py} r="1.5" fill={p.color} fillOpacity="0.7" />
            <circle cx={cx - halfW} cy={py} r="1.5" fill={p.color} fillOpacity="0.7" />

            {/* Right callout */}
            <line x1={cx + halfW} y1={py} x2={cx + halfW + 36} y2={py} stroke={p.color} strokeOpacity="0.55" strokeWidth="0.75" />
            <line x1={cx + halfW + 36} y1={py} x2={cx + halfW + 44} y2={py - 7} stroke={p.color} strokeOpacity="0.55" strokeWidth="0.75" />
            <text x={cx + halfW + 48} y={py - 9} fill="#ffffff" fillOpacity="0.9" fontSize="10" fontWeight="800" fontFamily="ui-sans-serif" letterSpacing="0.3">{p.label}</text>
            <text x={cx + halfW + 48} y={py + 3} fill={p.color} fillOpacity="0.85" fontSize="6.5" fontFamily="ui-monospace" letterSpacing="1.4">{p.code}</text>
          </g>
        );
      })}

      {/* Top: Final Human Audit beacon */}
      <g>
        <circle cx={cx} cy={cy - 178} r="14" fill="#f59e0b" fillOpacity="0.08" />
        <circle cx={cx} cy={cy - 178} r="7" fill="#f59e0b" fillOpacity="0.18" />
        <circle cx={cx} cy={cy - 178} r="3.5" fill="#fbbf24" />
        {/* Left callout for audit */}
        <line x1={cx} y1={cy - 178} x2={cx - 42} y2={cy - 178} stroke="#f59e0b" strokeOpacity="0.55" strokeWidth="0.75" />
        <line x1={cx - 42} y1={cy - 178} x2={cx - 50} y2={cy - 171} stroke="#f59e0b" strokeOpacity="0.55" strokeWidth="0.75" />
        <text x={cx - 54} y={cy - 180} textAnchor="end" fill="#fbbf24" fillOpacity="0.95" fontSize="7.5" fontFamily="ui-monospace" letterSpacing="1.4" fontWeight="700">FINAL · HUMAN AUDIT</text>
        <text x={cx - 54} y={cy - 168} textAnchor="end" fill="#ffffff" fillOpacity="0.4" fontSize="6" fontFamily="ui-monospace" letterSpacing="1.2">QA ≥ 9.5</text>
      </g>

      {/* Bottom: foundation label */}
      <g>
        <circle cx={cx} cy={cy + 168} r="3" fill="#2563eb" fillOpacity="0.7" />
        <line x1={cx - 70} y1={cy + 168} x2={cx + 70} y2={cy + 168} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.5" />
        <text x={cx} y={cy + 188} textAnchor="middle" fill="#ffffff" fillOpacity="0.45" fontSize="7" fontFamily="ui-monospace" letterSpacing="2">CLOUDBOOKS · EDITORIAL CORE</text>
      </g>

      {/* Spec annotations (very subtle, blueprint chrome) */}
      <g fill="#ffffff" fillOpacity="0.22" fontSize="6" fontFamily="ui-monospace" letterSpacing="1">
        <text x="34" y="40">SPEC · 001</text>
        <text x="446" y="40" textAnchor="end">REV · 2026.05</text>
        <text x="34" y="450">SCALE · 1:1</text>
        <text x="446" y="450" textAnchor="end">SHEET · A</text>
      </g>
    </svg>
  );
}
