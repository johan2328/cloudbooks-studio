import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Check, Loader2, BookOpen, Mail, BellRing, Clock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { joinWaitlist, type WaitlistEntry } from "@/lib/waitlist";
import { formatDef, PACK_COLOR, fmtUSD } from "@/lib/catalog";
import { BookCover } from "@/components/book-cover";

/* ════════════════════════════════════════════════════════════════════════════
   RESERVA / LISTA DE ESPERA — las ventas todavía no están abiertas.

   Esto ERA un checkout simulado y se convirtió deliberadamente: pedía número de
   tarjeta con `autoComplete="cc-number"` (el navegador ofrecía la tarjeta REAL
   del visitante), mostraba sellos de "Procesado por Stripe", "pago cifrado SSL",
   "no almacenamos tu tarjeta" y "garantía de reembolso", y confirmaba una compra
   diciendo "te enviamos el acceso a tu email" — sin cobrar, sin entregar y sin
   enviar nada. Ninguna de esas afirmaciones era cierta.

   Mientras no exista el backend de pagos, acá NO se piden datos de tarjeta ni se
   promete nada. Se registra a quién avisar cuando abran las ventas.
   // TODO_REAL: Stripe Elements + orden en backend → ver PAYMENTS_INTEGRATION.md
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", teal: "#2dd4bf", bright: "#c4b5fd", green: "#34d399", gold: "#fbbf24",
};

const inputCls = "w-full h-11 rounded-lg px-3.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 transition-[box-shadow,border-color] placeholder:opacity-50";
const inputStyle: React.CSSProperties = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };

type Stage = "form" | "processing" | "done";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const cart = useCart();
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reserved, setReserved] = useState<WaitlistEntry[]>([]);

  const total = cart.total;
  const canReserve = email.includes("@") && cart.count > 0;

  const reservar = () => {
    if (!canReserve) return;
    setStage("processing");
    const requestedAt = new Date().toISOString();
    const entries: WaitlistEntry[] = cart.items.map(i => ({
      id: i.id, name: i.name, cert: i.cert, format: i.format, price: i.price, email, requestedAt,
    }));
    setTimeout(() => {
      joinWaitlist(entries);
      setReserved(entries);
      cart.clear();
      setStage("done");
    }, 700);
  };

  /* ── pantalla de éxito ── */
  if (stage === "done") {
    return (
      <Shell setLocation={setLocation} cartCount={0}>
        <div role="status" aria-live="polite" className="mx-auto max-w-[640px] px-6 py-16 text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6" style={{ backgroundColor: `${C.green}1f`, border: `1px solid ${C.green}` }}>
            <Check className="w-8 h-8" style={{ color: C.green }} />
          </motion.div>
          <h1 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Anotado</h1>
          <p className="mt-3 text-[15px]" style={{ color: C.inkSoft }}>
            Te avisamos a <span style={{ color: C.ink }}>{email}</span> cuando abramos las ventas. No hay ningún cobro: todavía no vendemos.
          </p>
          <div className="mt-7 rounded-2xl p-5 text-left" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: C.inkSoft }}>Te avisamos por</p>
            <div className="flex flex-col gap-2.5">
              {reserved.map(b => (
                <div key={b.id} className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 shrink-0" style={{ color: C.violet }} />
                  <span className="text-[14px] flex-1" style={{ fontFamily: D, fontWeight: 600 }}>{b.name}</span>
                  <span className="text-[12px]" style={{ color: C.inkSoft }}>{b.cert}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 text-white px-6 h-12 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
              <BookOpen className="w-4 h-4" /> Seguir explorando el catálogo
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── carrito vacío ── */
  if (cart.count === 0) {
    return (
      <Shell setLocation={setLocation} cartCount={0}>
        <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto mb-4" style={{ color: `${C.ink}33` }} />
          <h1 className="text-2xl" style={{ fontFamily: D, fontWeight: 700 }}>Tu carrito está vacío</h1>
          <p className="mt-2 text-sm" style={{ color: C.inkSoft }}>Explora las colecciones y añade libros para continuar.</p>
          <button onClick={() => setLocation("/colecciones")} className="mt-6 px-6 h-11 rounded-full text-sm text-white" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Ir a la tienda</button>
        </div>
      </Shell>
    );
  }

  /* ── formulario ── */
  return (
    <Shell setLocation={setLocation} cartCount={cart.count}>
      <div className="mx-auto max-w-[1040px] px-6 py-10">
        <button onClick={() => setLocation("/colecciones")} className="inline-flex items-center gap-1.5 text-[13px] mb-6 transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}><ArrowLeft className="w-4 h-4" /> Volver al catálogo</button>
        <h1 className="tracking-[-0.03em] mb-8" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.9rem,4vw,2.8rem)" }}>Reservar tu ejemplar</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* datos + pago */}
          <div className="flex flex-col gap-4">
            <Card step="1" title="Tus datos" icon={Mail}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email"><input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputCls} style={inputStyle} /></Field>
                <Field label="Nombre"><input type="text" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} style={inputStyle} /></Field>
              </div>
              <p className="mt-2 text-[12px] flex items-center gap-1.5" style={{ color: C.inkSoft }}><Mail className="w-3.5 h-3.5" /> Aquí te avisamos cuando abramos las ventas.</p>
            </Card>

            {/* NO se piden datos de tarjeta: no hay backend de pagos, así que pedirlos
                seria recolectar datos sensibles sin motivo ni forma de protegerlos. */}
            <Card step="2" title="Todavía no vendemos" icon={Clock}>
              <p className="text-[14px] leading-relaxed" style={{ color: C.inkSoft }}>
                Estamos completando el catálogo antes de abrir las ventas. Cuando abramos, te escribimos
                al email de arriba con el enlace de compra — <span style={{ color: C.ink }}>sin cobro previo
                y sin compromiso</span>.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-[13px]" style={{ color: C.inkSoft }}>
                <li className="flex items-start gap-2"><BellRing className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.violet }} /> Te avisamos una sola vez, cuando el libro esté disponible.</li>
                <li className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.violet }} /> Usamos tu email solo para eso. Podés pedir que te saquemos cuando quieras.</li>
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]" style={{ backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33`, color: C.gold }}>
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> No se te pide ningún dato de pago ni se realiza ningún cobro. Esta reserva no es una compra.
              </div>
            </Card>
          </div>

          {/* resumen */}
          <div className="lg:sticky lg:top-6 rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: C.inkSoft }}>Resumen del pedido</p>
            <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
              {cart.items.map(i => {
                const coverColor = i.format === "Collection Pack" ? PACK_COLOR : (formatDef(i.format)?.color ?? C.violet);
                return (
                <div key={i.id} className="flex items-start gap-3">
                  <div className="w-9 shrink-0 rounded overflow-hidden self-start" style={{ aspectRatio: "1023 / 1537", border: `1px solid ${C.ink}14` }}>
                    <BookCover id={i.id} color={coverColor} format={i.format} cert={i.cert} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] truncate" style={{ fontFamily: D, fontWeight: 600 }}>{i.name}</p>
                    <p className="text-[11px]" style={{ color: C.inkSoft }}>{i.cert} · {i.format}</p>
                  </div>
                  <span className="text-[13px] font-mono shrink-0" style={{ color: C.inkSoft }}>{fmtUSD(i.price)}</span>
                </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${C.ink}14` }}>
              <span className="text-sm" style={{ color: C.inkSoft }}>Precio previsto</span>
              <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.6rem" }}>{fmtUSD(total)}</span>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: `${C.ink}55` }}>Referencial: no se cobra ahora y puede cambiar antes del lanzamiento.</p>
            <button onClick={reservar} disabled={!canReserve || stage === "processing"}
              className="mt-4 w-full h-12 rounded-full text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 700 }}>
              {stage === "processing"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Anotando…</>
                : <><BellRing className="w-4 h-4" /> Avisarme cuando esté disponible</>}
            </button>
            {!email.includes("@") && <p className="mt-2 text-[12px] text-center" style={{ color: C.inkSoft }}>Ingresa tu email para continuar.</p>}
            {/* Qué es cierto hoy. NO poner sellos de pago/entrega: no hay cobro ni entrega. */}
            <div className="mt-5 pt-4 flex flex-col gap-2 text-[12px]" style={{ borderTop: `1px solid ${C.ink}14`, color: C.inkSoft }}>
              <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Sin cobro: las ventas todavía no están abiertas</span>
              <span className="flex items-center gap-2"><BellRing className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Un solo aviso, cuando el libro esté listo</span>
              <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Tu email solo se usa para ese aviso</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* Las marcas de tarjeta (Visa/Mastercard/Maestro/JCB/Mercado Pago) se quitaron junto
   con el formulario de pago: anunciaban medios de cobro que no existen. Vuelven con
   el backend real, cuando sean ciertas. Los SVG siguen en public/badges/. */

/* ── chrome ── */
function Shell({ children, setLocation, cartCount }: { children: React.ReactNode; setLocation: (p: string) => void; cartCount: number }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.9)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1240px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <div className="flex items-center gap-2 text-[13px]" style={{ color: C.inkSoft }}>
            <Clock className="w-3.5 h-3.5" style={{ color: C.teal }} /> Reserva sin cobro
            {cartCount > 0 && <span className="ml-2 inline-flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> {cartCount}</span>}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Card({ step, title, icon: Icon, children }: { step: string; title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] shrink-0" style={{ backgroundColor: `${C.violet}1f`, color: C.bright, fontFamily: D, fontWeight: 700 }}>{step}</span>
        <Icon className="w-4 h-4" style={{ color: C.violet }} />
        <h2 className="text-[16px]" style={{ fontFamily: D, fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>{label}</span>{children}</label>;
}
