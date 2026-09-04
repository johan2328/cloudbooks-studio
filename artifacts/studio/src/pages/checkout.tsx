import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Lock, CreditCard, Check, Zap, Loader2, BookOpen, Mail, Wallet, BadgeCheck, KeyRound } from "lucide-react";
import { useCart } from "@/lib/cart";
import { addToLibrary, type OwnedBook } from "@/lib/library";
import { formatDef, PACK_COLOR, fmtUSD } from "@/lib/catalog";
import { BookCover } from "@/components/book-cover";
import { SiVisa, SiMastercard, SiJcb, SiMercadopago } from "react-icons/si";

/* ════════════════════════════════════════════════════════════════════════════
   CHECKOUT — flujo de compra (PROTOTIPO). No realiza ningún cobro real.
   // TODO_REAL: conectar Stripe + crear orden en backend.
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
  const [order, setOrder] = useState("");
  const [bought, setBought] = useState<OwnedBook[]>([]);
  const [method, setMethod] = useState<"card" | "paypal">("card");

  const total = cart.total;
  const canPay = email.includes("@") && cart.count > 0;

  const pay = () => {
    if (!canPay) return;
    setStage("processing");
    const orderId = `CB-${Date.now().toString(36).toUpperCase()}`;
    const items: OwnedBook[] = cart.items.map(i => ({ id: i.id, name: i.name, cert: i.cert, format: i.format, price: i.price, order: orderId, purchasedAt: new Date().toISOString() }));
    setTimeout(() => {
      addToLibrary(items);
      setOrder(orderId); setBought(items);
      cart.clear();
      setStage("done");
    }, 1300);
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
          <h1 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>¡Compra confirmada!</h1>
          <p className="mt-3 text-[15px]" style={{ color: C.inkSoft }}>
            Pedido <span className="font-mono" style={{ color: C.bright }}>{order}</span>. Te enviamos el acceso a <span style={{ color: C.ink }}>{email}</span>.
          </p>
          <div className="mt-7 rounded-2xl p-5 text-left" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: C.inkSoft }}>Ya tienes acceso a</p>
            <div className="flex flex-col gap-2.5">
              {bought.map(b => (
                <div key={b.id} className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 shrink-0" style={{ color: C.violet }} />
                  <span className="text-[14px] flex-1" style={{ fontFamily: D, fontWeight: 600 }}>{b.name}</span>
                  <span className="text-[12px]" style={{ color: C.inkSoft }}>{b.cert}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setLocation("/mi-biblioteca")} className="group flex items-center gap-2 text-white px-6 h-12 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
              <BookOpen className="w-4 h-4" /> Ir a Mi biblioteca
            </button>
            <button onClick={() => setLocation("/colecciones")} className="px-5 h-12 rounded-full text-sm border transition-all hover:bg-white/5" style={{ fontFamily: D, fontWeight: 500, borderColor: `${C.ink}26`, color: C.ink }}>Seguir comprando</button>
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
        <button onClick={() => setLocation("/colecciones")} className="inline-flex items-center gap-1.5 text-[13px] mb-6 transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}><ArrowLeft className="w-4 h-4" /> Seguir comprando</button>
        <h1 className="tracking-[-0.03em] mb-8" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.9rem,4vw,2.8rem)" }}>Finalizar compra</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* datos + pago */}
          <div className="flex flex-col gap-4">
            <Card step="1" title="Tus datos" icon={Mail}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email"><input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputCls} style={inputStyle} /></Field>
                <Field label="Nombre"><input type="text" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} style={inputStyle} /></Field>
              </div>
              <p className="mt-2 text-[12px] flex items-center gap-1.5" style={{ color: C.inkSoft }}><Mail className="w-3.5 h-3.5" /> Aquí enviamos el acceso a tus libros.</p>
            </Card>

            <Card step="2" title="Método de pago" icon={Lock}>
              {/* selector de método */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {([["card", "Tarjeta", CreditCard], ["paypal", "PayPal", Wallet]] as const).map(([m, label, Ic]) => (
                  <button key={m} onClick={() => setMethod(m)} className="h-12 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                    style={method === m ? { backgroundColor: `${C.violet}1f`, border: `1.5px solid ${C.violet}`, color: C.ink, fontFamily: D, fontWeight: 700 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                    <Ic className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {method === "card" ? (
                <div className="flex flex-col gap-4">
                  {/* TODO_REAL: reemplazar por Stripe Elements (CardElement) */}
                  <Field label="Número de tarjeta">
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
                      <input inputMode="numeric" name="cc-number" autoComplete="cc-number" spellCheck={false} placeholder="1234 1234 1234 1234" className={inputCls + " pl-10"} style={inputStyle} />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Vencimiento"><input name="cc-exp" autoComplete="cc-exp" placeholder="MM / AA" className={inputCls} style={inputStyle} /></Field>
                    <Field label="CVC"><input inputMode="numeric" name="cc-csc" autoComplete="cc-csc" spellCheck={false} placeholder="123" className={inputCls} style={inputStyle} /></Field>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap"><PayMark id="visa" /><PayMark id="mastercard" /><PayMark id="maestro" /><PayMark id="jcb" /><PayMark id="mercadopago" /></div>
                    <span className="text-[11px] inline-flex items-center gap-1.5" style={{ color: C.inkSoft }}><Lock className="w-3 h-3" style={{ color: C.teal }} /> Procesado por Stripe</span>
                  </div>
                </div>
              ) : (
                /* TODO_REAL: reemplazar por el botón oficial del PayPal JS SDK */
                <div className="rounded-xl p-5 text-center" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f` }}>
                  <Wallet className="w-7 h-7 mx-auto mb-2" style={{ color: C.bright }} />
                  <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 600 }}>Pagar con PayPal</p>
                  <p className="text-[12px] mt-1 max-w-xs mx-auto" style={{ color: C.inkSoft }}>Te redirigiremos a PayPal para completar el pago de forma segura. No compartimos tus datos con el vendedor.</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]" style={{ backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33`, color: C.gold }}>
                <Lock className="w-3.5 h-3.5 shrink-0" /> Demo — no se realiza ningún cobro real. En producción se conecta con Stripe y PayPal.
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
              <span className="text-sm" style={{ color: C.inkSoft }}>Total</span>
              <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.6rem" }}>{fmtUSD(total)}</span>
            </div>
            <button onClick={pay} disabled={!canPay || stage === "processing"}
              className="mt-4 w-full h-12 rounded-full text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 700 }}>
              {stage === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : method === "paypal" ? <><Wallet className="w-4 h-4" /> Continuar con PayPal</> : <><Lock className="w-4 h-4" /> Pagar {fmtUSD(total)}</>}
            </button>
            {!email.includes("@") && <p className="mt-2 text-[12px] text-center" style={{ color: C.inkSoft }}>Ingresa tu email para continuar.</p>}
            {/* sellos de confianza */}
            <div className="mt-5 pt-4 flex flex-col gap-2 text-[12px]" style={{ borderTop: `1px solid ${C.ink}14`, color: C.inkSoft }}>
              <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Pago cifrado SSL de extremo a extremo</span>
              <span className="flex items-center gap-2"><KeyRound className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> No almacenamos los datos de tu tarjeta</span>
              <span className="flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Garantía de satisfacción · reembolso</span>
              <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Acceso inmediato tras la compra</span>
            </div>
            <p className="mt-3 text-[11px] text-center" style={{ color: `${C.ink}55` }}>Pagos procesados de forma segura por Stripe y PayPal</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── marcas de tarjeta (SVG de react-icons / simple-icons, sin descargas) ──
   Maestro no está en la librería: comparte el símbolo de Mastercard, se tinta
   en el azul de Maestro. */
const PAYMARK = {
  visa:        { src: "/badges/visa.svg",        Icon: SiVisa,        color: "#1434CB", label: "Visa" },
  mastercard:  { src: "/badges/mastercard.svg",  Icon: SiMastercard,  color: "#EB001B", label: "Mastercard" },
  maestro:     { src: "/badges/maestro.svg",     Icon: SiMastercard,  color: "#0099DF", label: "Maestro" },
  jcb:         { src: "/badges/jcb.svg",          Icon: SiJcb,         color: "#0B4EA2", label: "JCB" },
  mercadopago: { src: "/badges/mercadopago.svg", Icon: SiMercadopago, color: "#009EE3", label: "Mercado Pago" },
} as const;
function PayMark({ id }: { id: keyof typeof PAYMARK }) {
  const { src, Icon, color, label } = PAYMARK[id];
  const [err, setErr] = useState(false);
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px]"
      style={{ width: 46, height: 30, background: "#fff", border: "1px solid rgba(0,0,0,0.10)", boxShadow: "0 1px 2px rgba(0,0,0,0.20)" }}
      title={label}
      aria-label={label}
    >
      {err
        ? <Icon size={20} color={color} aria-hidden />
        : <img src={src} alt={label} onError={() => setErr(true)} style={{ height: 22, width: "auto", maxWidth: 40, display: "block", objectFit: "contain" }} />}
    </span>
  );
}

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
            <Lock className="w-3.5 h-3.5" style={{ color: C.teal }} /> Compra segura
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
