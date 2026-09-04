import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight, Globe, AlertTriangle } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   AVISO LEGAL — página dedicada, consistente con la marca del landing.
   ⚠️ PLANTILLA: reemplaza los datos entre [corchetes] y revísala con un asesor
   legal antes de publicar. Ruta /aviso-legal.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", bright: "#c4b5fd", gold: "#fbbf24", teal: "#2dd4bf",
};

/* ⚠️ // TODO_REAL — completar con datos legales reales */
const SECTIONS: { t: string; p: string[] }[] = [
  { t: "1. Identificación del titular", p: [
    "El presente sitio web y los productos digitales que en él se ofrecen son titularidad de CloudBooks ([razón social / nombre del titular]), con domicilio en [dirección completa], identificación fiscal [RUC/NIT/CUIT/RFC u equivalente] y correo de contacto [correo@cloudbooks.xx].",
    "El acceso y uso de este sitio atribuye la condición de usuario e implica la aceptación plena de las disposiciones de este Aviso Legal.",
  ] },
  { t: "2. Objeto", p: [
    "CloudBooks es un proyecto editorial que produce y comercializa colecciones de estudio digitales para la preparación de certificaciones cloud, en seis formatos complementarios. El presente Aviso Legal regula el acceso, la navegación y el uso del sitio, así como la adquisición de dichos productos.",
  ] },
  { t: "3. Condiciones de uso", p: [
    "El usuario se compromete a hacer un uso lícito, diligente y conforme a la ley de este sitio y de los contenidos adquiridos, absteniéndose de realizar cualquier actividad que pueda dañar, inutilizar o sobrecargar el servicio, o impedir su normal utilización por otros usuarios.",
  ] },
  { t: "4. Propiedad intelectual e industrial", p: [
    "Todos los contenidos del sitio y de las colecciones (textos, diagramas, ilustraciones, diseño, marca, logotipos y código) son titularidad de CloudBooks o de sus licenciantes y están protegidos por la normativa de propiedad intelectual e industrial.",
    "Queda prohibida su reproducción, distribución, comunicación pública, transformación o cualquier otra forma de explotación, total o parcial, sin autorización previa y por escrito del titular.",
  ] },
  { t: "5. Licencia de uso de los productos digitales", p: [
    "La compra de cualquier formato o del Collection Pack otorga al usuario una licencia personal, intransferible y no exclusiva para su uso individual con fines de estudio.",
    "No está permitido compartir, revender, redistribuir, publicar ni poner a disposición de terceros los materiales adquiridos, en todo o en parte.",
  ] },
  { t: "6. Compras, precios y pagos", p: [
    "Los precios se muestran en dólares estadounidenses (USD) e incluyen los impuestos que correspondan según la legislación aplicable. Los pagos se procesan a través de [pasarela de pago].",
    "La entrega de los productos es digital e inmediata tras la confirmación del pago. Por tratarse de bienes digitales de acceso inmediato, la política de devoluciones se rige por lo indicado en [enlace a la política de devoluciones / garantía].",
  ] },
  { t: "7. Actualizaciones y reediciones", p: [
    "Cuando una certificación cubierta por una colección se actualice, CloudBooks reeditará los libros afectados y los reenviará a los compradores del Collection Pack sin costo adicional, en un plazo aproximado de una (1) semana. Esta condición aplica según los términos vigentes al momento de la compra.",
  ] },
  { t: "8. Exención de responsabilidad y resultados", p: [
    "CloudBooks elabora material de estudio sometido a auditoría de calidad; no obstante, no garantiza la aprobación de ningún examen ni la obtención de ninguna certificación. El resultado depende de factores ajenos a la editorial, como la dedicación del estudiante, los cambios en los exámenes y las políticas de cada proveedor.",
    "El contenido se ofrece con fines educativos y de preparación. CloudBooks no será responsable por daños derivados del uso o de la imposibilidad de uso del sitio o de los materiales, salvo en lo que la ley imperativamente establezca.",
  ] },
  { t: "9. Marcas de terceros", p: [
    "Microsoft, Azure, Amazon Web Services (AWS), Google Cloud y los nombres, logotipos y códigos de sus certificaciones (por ejemplo, AI-200) son marcas registradas de sus respectivos titulares. CloudBooks es un proyecto editorial independiente, con fines educativos y de preparación, y no está afiliado, patrocinado ni avalado por Microsoft, Amazon Web Services ni Google. Los materiales de CloudBooks no son productos oficiales de esos proveedores ni reemplazan su documentación oficial.",
  ] },
  { t: "10. Enlaces a terceros", p: [
    "El sitio puede contener enlaces a páginas de terceros. CloudBooks no se responsabiliza de los contenidos, políticas o prácticas de dichos sitios, cuyo acceso es responsabilidad exclusiva del usuario.",
  ] },
  { t: "11. Protección de datos personales", p: [
    "Los datos personales que el usuario facilite se tratarán conforme a la legislación de protección de datos aplicable y a la política de privacidad de CloudBooks. El usuario podrá ejercer sus derechos de acceso, rectificación, cancelación y oposición escribiendo a [correo@cloudbooks.xx].",
  ] },
  { t: "12. Modificaciones", p: [
    "CloudBooks se reserva el derecho de modificar el presente Aviso Legal en cualquier momento. Los cambios entrarán en vigor desde su publicación en el sitio.",
  ] },
  { t: "13. Legislación aplicable y jurisdicción", p: [
    "El presente Aviso Legal se rige por las leyes de [país / jurisdicción]. Para la resolución de cualquier controversia, las partes se someten a los tribunales de [ciudad / jurisdicción competente], salvo que la normativa de consumo aplicable disponga otro fuero.",
  ] },
  { t: "14. Contacto", p: [
    "Para cualquier consulta relacionada con este Aviso Legal, puedes escribir a [correo@cloudbooks.xx].",
  ] },
];

export default function AvisoLegal() {
  const [, setLocation] = useLocation();
  const enHref = typeof window !== "undefined"
    ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}`
    : "#";

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1240px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.inkSoft }}>
            {[["Nuestra Labor", "/nuestra-labor"], ["Empresas", "/empresas"], ["Demo", "/demo"], ["Colecciones", "/colecciones"]].map(([l, h]) => (
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: 0.85 }}>{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              Ver colecciones <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 lg:pt-40 pb-10" style={{ background: `radial-gradient(120% 80% at 80% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="mx-auto max-w-[820px] px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: C.violet }}>Legal</p>
          <h1 className="tracking-[-0.04em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.4rem,5.5vw,3.8rem)", lineHeight: 0.98 }}>Aviso legal</h1>
          <p className="mt-4 text-sm" style={{ color: C.inkSoft }}>Última actualización: [fecha]{/* TODO_REAL */}</p>
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <section className="pb-24">
        <div className="mx-auto max-w-[820px] px-6">
          {/* aviso de borrador */}
          <div className="flex items-start gap-3 rounded-xl p-4 mb-12" style={{ backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}3a` }}>
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: C.gold }} />
            <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
              <b style={{ color: C.ink }}>Documento de muestra.</b> Reemplaza los datos entre [corchetes] por la información real de tu empresa y haz revisar este texto por un asesor legal antes de publicarlo. No constituye asesoramiento jurídico.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {SECTIONS.map(s => (
              <div key={s.t}>
                <h2 className="text-xl mb-3 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{s.t}</h2>
                <div className="flex flex-col gap-3">
                  {s.p.map((para, i) => (
                    <p key={i} className="text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
