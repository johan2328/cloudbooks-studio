import { useState } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   BOOKCOVER — portada del libro. Usa la imagen real en /public/covers/<id>.<ext>
   (webp → jpg → png) y, si no existe, cae a una portada CSS. Llena su contenedor;
   el tamaño/relación lo define el padre (p. ej. aspect-[3/4]).
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const EXTS = ["webp", "jpg", "png"];

export function BookCover({ id, color, format, cert, priority = false }: { id: string; color: string; format: string; cert: string; priority?: boolean }) {
  const [i, setI] = useState(0);
  if (i < EXTS.length) {
    return (
      <img src={`/covers/${id}.${EXTS[i]}`} alt={`${format} — ${cert}`} onError={() => setI(i + 1)} draggable={false}
        loading={priority ? "eager" : "lazy"} decoding="async" {...(priority ? { fetchPriority: "high" as const } : {})}
        className="w-full h-full object-contain" />
    );
  }
  // fallback CSS (hasta que exista el archivo)
  return (
    <div className="w-full h-full flex flex-col justify-between" style={{ background: `linear-gradient(150deg, ${color} -8%, #0b0b12 72%)`, padding: "9%", containerType: "inline-size" }}>
      <span style={{ fontFamily: D, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "clamp(6px,5cqw,12px)" }}>{cert}</span>
      <span style={{ fontFamily: D, fontWeight: 700, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em", fontSize: "clamp(11px,13cqw,28px)" }}>{format}</span>
      <span style={{ fontFamily: D, color: "rgba(255,255,255,0.6)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "clamp(5px,3.5cqw,9px)" }}>CloudBooks</span>
    </div>
  );
}
