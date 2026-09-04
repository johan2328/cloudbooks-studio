import { useLocation } from "wouter";
import { ShieldCheck, AlertTriangle, ArrowRight, Globe } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

/* ════════════════════════════════════════════════════════════════════════════
   POLÍTICA DE PRIVACIDAD — plantilla ORIGINAL para CloudBooks (Argentina, Ley
   25.326 de Protección de los Datos Personales). Completar los [corchetes].
   // TODO_REAL: revisar con asesoría legal antes de publicar.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.6)",
  violet: "#8b5cf6", bright: "#c4b5fd", teal: "#2dd4bf", gold: "#fbbf24",
};

const SECTIONS = [
  { t: "1. Responsable del tratamiento", b: "El responsable de la base de datos es [Razón social], CUIT [XX-XXXXXXXX-X], con domicilio en [domicilio], correo de contacto [privacidad@cloudbooks.xxx]. Tratamos tus datos personales conforme a la Ley 25.326 de Protección de los Datos Personales y su normativa complementaria." },
  { t: "2. Qué datos recopilamos", b: "Datos que nos brindás: nombre y correo electrónico al crear tu cuenta o comprar. Datos de la transacción: productos adquiridos e historial de pedidos (los datos de tu tarjeta los procesa el proveedor de pago, no CloudBooks). Datos de uso: páginas vistas, dispositivo, navegador y datos de cookies/analítica." },
  { t: "3. Para qué los usamos", b: "Para procesar tu compra y darte acceso a los libros; enviarte el comprobante y las actualizaciones del material; brindarte soporte; mejorar el sitio y prevenir fraude; y, si lo consentís, enviarte comunicaciones sobre nuevas colecciones." },
  { t: "4. Base legal y consentimiento", b: "Tratamos tus datos para ejecutar la relación de compra, cumplir obligaciones legales y, cuando corresponde, en base a tu consentimiento (por ejemplo, marketing). Podés retirar tu consentimiento en cualquier momento sin afectar la licitud del tratamiento previo." },
  { t: "5. Pagos", b: "Los pagos se procesan mediante [Stripe / PayPal]. CloudBooks no almacena los números completos de tarjeta. El proveedor de pago trata esos datos bajo sus propias políticas y estándares de seguridad (PCI-DSS)." },
  { t: "6. Cookies y tecnologías similares", b: "Usamos cookies y almacenamiento local para mantener tu sesión, recordar tu carrito y medir el uso del sitio. Podés configurar tu navegador para bloquearlas; algunas funciones podrían dejar de operar. [Detallar herramientas de analítica utilizadas.]" },
  { t: "7. Con quién compartimos tus datos", b: "Solo con proveedores que nos prestan servicios (pago, envío de correos, hosting y analítica), bajo obligación de confidencialidad y únicamente para las finalidades descritas. No vendemos tus datos personales." },
  { t: "8. Transferencias internacionales", b: "Algunos proveedores pueden estar ubicados fuera de Argentina. En esos casos adoptamos los resguardos exigidos por la normativa aplicable para garantizar un nivel adecuado de protección de tus datos." },
  { t: "9. Conservación", b: "Conservamos tus datos mientras tu cuenta esté activa y durante los plazos exigidos por obligaciones legales, contables y fiscales. Luego los eliminamos o anonimizamos." },
  { t: "10. Seguridad", b: "Aplicamos medidas técnicas y organizativas razonables para proteger tus datos (cifrado en tránsito, control de accesos). Ningún sistema es 100% infalible; ante un incidente actuaremos conforme a la normativa vigente." },
  { t: "11. Tus derechos", b: "Tenés derecho a acceder, rectificar, actualizar y suprimir tus datos personales, y a oponerte a su tratamiento. Para ejercerlos, escribí a [privacidad@cloudbooks.xxx]. El titular puede solicitar gratuitamente el acceso a sus datos a intervalos no inferiores a seis meses (art. 14, inc. 3, Ley 25.326)." },
  { t: "12. Autoridad de control", b: "La Agencia de Acceso a la Información Pública (AAIP), órgano de control de la Ley 25.326, atiende denuncias y reclamos por incumplimientos a la normativa de protección de datos personales." },
  { t: "13. Menores de edad", b: "El servicio está dirigido a personas mayores de edad. No recopilamos intencionalmente datos de menores sin el consentimiento de quien ejerce la responsabilidad parental." },
  { t: "14. Cambios y contacto", b: "Podemos actualizar esta política; publicaremos la versión vigente con su fecha. Ante cualquier consulta sobre tus datos, escribí a [privacidad@cloudbooks.xxx]." },
];

export default function PoliticaPrivacidad() {
  const [, setLocation] = useLocation();
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1240px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés" className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => setLocation("/ayuda")} className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              Ayuda y Soporte <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 lg:pt-40 pb-10" style={{ background: `radial-gradient(120% 80% at 80% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="mx-auto max-w-[820px] px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4 inline-flex items-center gap-2" style={{ color: C.teal }}><ShieldCheck className="w-4 h-4" /> Privacidad</p>
          <h1 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.4rem,5.5vw,3.8rem)", lineHeight: 1 }}>Política de Privacidad</h1>
          <p className="mt-5 text-lg" style={{ color: C.inkSoft }}>Cómo tratamos y protegemos tus datos personales. Última actualización: [fecha].</p>
        </div>
      </section>

      {/* ── BANNER plantilla ── */}
      <section className="pb-2">
        <div className="mx-auto max-w-[820px] px-6">
          <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}33` }}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.gold }} />
            <p className="text-[13px] leading-relaxed" style={{ color: C.gold }}>
              Borrador con datos entre [corchetes] pendientes de completar. Documento orientativo — revisar con asesoría legal antes de publicar.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECCIONES ── */}
      <section className="py-12">
        <div className="mx-auto max-w-[820px] px-6 flex flex-col gap-9">
          {SECTIONS.map(s => (
            <div key={s.t}>
              <h2 className="text-xl mb-2.5 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{s.t}</h2>
              <p className="text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{s.b}</p>
            </div>
          ))}
          <p className="text-[13px] pt-4" style={{ borderTop: `1px solid ${C.ink}1f`, color: `${C.ink}55` }}>
            ¿Buscás los términos generales del servicio? Mirá el{" "}
            <button onClick={() => setLocation("/aviso-legal")} className="underline underline-offset-4" style={{ color: C.bright }}>Aviso legal</button>.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
