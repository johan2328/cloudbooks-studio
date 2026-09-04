import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Product } from "@/lib/catalog";

/* ════════════════════════════════════════════════════════════════════════════
   SAMPLE BOOK — visor de páginas de muestra reutilizable (inline, no modal).
   Páginas generadas como demo (papel crema + marca de agua). // TODO_REAL
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const PAPER = "#f7f5ef", PINK = "#23232b", PSOFT = "#6b6b73", PLINE = "#e2dfd5";
const C = { card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)" };

interface SPage { kind: "title" | "toc" | "content" | "visual"; title?: string; idx?: number; }

export function buildSamplePages(product: Product, toc: string[]): SPage[] {
  const visual = /atlas|visual/i.test(product.format);
  const t = (toc || []).filter(Boolean);
  const pages: SPage[] = [{ kind: "title" }, { kind: "toc" }];
  t.slice(0, 5).forEach((x, i) => pages.push({ kind: visual ? "visual" : "content", title: x, idx: i }));
  return pages.slice(0, 8);
}

function FauxText({ lines }: { lines: number }) {
  const w = ["100%", "96%", "90%", "98%", "84%", "93%", "88%", "95%"];
  return <div className="flex flex-col gap-2 w-full">{Array.from({ length: lines }).map((_, i) => <div key={i} className="h-2 rounded" style={{ background: PLINE, width: w[i % w.length] }} />)}</div>;
}

export function SamplePageBody({ page, product, toc }: { page: SPage; product: Product; toc: string[] }) {
  const accent = product.color;
  return (
    <div className="relative w-full h-full" style={{ color: PINK }}>
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ transform: "rotate(-28deg)" }}>
        <span style={{ fontFamily: D, fontWeight: 700, fontSize: "2.4rem", letterSpacing: "0.35em", color: "rgba(0,0,0,0.06)" }}>MUESTRA</span>
      </span>

      {page.kind === "title" && (
        <div className="h-full flex flex-col items-center justify-center text-center px-7">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded mb-5" style={{ fontFamily: D, fontWeight: 700, color: accent, border: `1px solid ${accent}66` }}>{product.cert}</span>
          <h3 style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.3rem,3vw,1.9rem)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{product.format}</h3>
          <p className="mt-2 text-[13px]" style={{ color: PSOFT }}>{product.certTitle}</p>
          <div className="my-5 h-px w-16" style={{ background: accent }} />
          <span className="text-[12px] uppercase tracking-[0.2em]" style={{ color: PSOFT }}>CloudBooks Editorial</span>
          <span className="mt-1 text-[11px]" style={{ color: PSOFT }}>Edición 2026 · Español (LATAM)</span>
        </div>
      )}

      {page.kind === "toc" && (
        <div className="h-full flex flex-col px-7 py-8">
          <h4 className="mb-5" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.3rem" }}>Índice</h4>
          <ol className="flex flex-col gap-3">
            {toc.slice(0, 8).map((t, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[13px]">
                <span className="font-mono shrink-0" style={{ color: accent, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate" style={{ color: PINK }}>{t}</span>
                <span className="flex-1 border-b border-dotted self-end mb-1" style={{ borderColor: "#cfccc2" }} />
                <span className="font-mono shrink-0" style={{ color: PSOFT }}>{(i + 1) * 12}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {page.kind === "content" && (
        <div className="h-full flex flex-col px-7 py-8 gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Capítulo {(page.idx ?? 0) + 1}</span>
          <h4 style={{ fontFamily: D, fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.15 }}>{page.title}</h4>
          <FauxText lines={5} />
          <div className="rounded-lg p-3" style={{ background: `${accent}14`, borderLeft: `3px solid ${accent}` }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: accent }}>NOTA DE EXAMEN</p>
            <FauxText lines={2} />
          </div>
          <FauxText lines={4} />
        </div>
      )}

      {page.kind === "visual" && (
        <div className="h-full flex flex-col px-7 py-8 gap-5">
          <h4 style={{ fontFamily: D, fontWeight: 700, fontSize: "1.15rem" }}>{page.title}</h4>
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="rounded-lg px-3 py-4 text-[10px] text-center" style={{ border: `1.5px solid ${accent}`, color: accent, minWidth: 56, fontWeight: 700 }}>·····</div>
                {i < 2 && <div className="w-5 h-px" style={{ background: accent }} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {[0, 1].map(i => <div key={i} className="rounded-lg px-3 py-3 text-[10px]" style={{ background: `${accent}14`, color: PSOFT, minWidth: 76 }}>—— ——</div>)}
          </div>
          <FauxText lines={3} />
        </div>
      )}
    </div>
  );
}

/* visor inline (sin overlay): hojeable, con miniaturas y teclado */
export function SampleViewer({ product, toc, height = "min(58vh, 460px)" }: { product: Product; toc: string[]; height?: string }) {
  const [index, setIndex] = useState(0);
  const [twoUp, setTwoUp] = useState(true);
  const pages = buildSamplePages(product, toc);
  const len = pages.length;
  const step = twoUp ? 2 : 1;

  useEffect(() => {
    const f = () => setTwoUp(window.innerWidth >= 900);
    f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f);
  }, []);
  useEffect(() => { setIndex(0); }, [product.id]);

  const go = (d: number) => setIndex(i => Math.max(0, Math.min(len - 1, i + d * step)));
  const atEnd = index + step >= len;
  const visible = twoUp ? [pages[index], pages[index + 1]].filter(Boolean) : [pages[index]];
  const counter = twoUp ? `Páginas ${index + 1}–${Math.min(index + 2, len)} de ${len}` : `Página ${index + 1} de ${len}`;
  const isVis = (j: number) => twoUp ? (j === index || j === index + 1) : j === index;

  return (
    <div className="rounded-2xl p-4 sm:p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button onClick={() => go(-1)} disabled={index === 0} aria-label="Anterior" className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-25 hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><ChevronLeft className="w-5 h-5" /></button>
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="flex items-stretch" style={{ height }}>
            {visible.map((pg, k) => {
              const left = twoUp && k === 0 && visible.length > 1;
              const right = twoUp && k === 1;
              return (
                <div key={k} className="relative overflow-hidden" style={{
                  aspectRatio: "3 / 4", height: "100%", background: PAPER,
                  borderRadius: twoUp ? (left ? "6px 2px 2px 6px" : "2px 6px 6px 2px") : "6px",
                  boxShadow: left ? "inset -16px 0 22px -16px rgba(0,0,0,0.3), 0 18px 44px -20px rgba(0,0,0,0.6)"
                    : right ? "inset 16px 0 22px -16px rgba(0,0,0,0.3), 0 18px 44px -20px rgba(0,0,0,0.6)"
                      : "0 18px 44px -20px rgba(0,0,0,0.6)",
                }}>
                  <SamplePageBody page={pg} product={product} toc={toc} />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
        <button onClick={() => go(1)} disabled={atEnd} aria-label="Siguiente" className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-25 hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {pages.map((_, j) => (
            <button key={j} onClick={() => setIndex(twoUp ? j - (j % 2) : j)} aria-label={`Página ${j + 1}`} className="w-7 h-9 rounded flex items-center justify-center text-[10px] transition-all"
              style={isVis(j) ? { background: PAPER, color: PINK, fontWeight: 700, border: `1px solid ${product.color}` } : { background: "#0a0a0e", color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{j + 1}</button>
          ))}
        </div>
        <p className="text-[12px]" style={{ color: C.inkSoft }}>{counter} · marca de agua en la muestra</p>
      </div>
    </div>
  );
}
