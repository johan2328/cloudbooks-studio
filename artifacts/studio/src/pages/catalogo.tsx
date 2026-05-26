import { useLocation } from "wouter";
import CatalogLayout from "@/components/CatalogLayout";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock, Cloud, Plus } from "lucide-react";

interface CloudProvider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  status: "active" | "planned";
  certCount: number;
  activeCount: number;
  description: string;
  href: string | null;
}

const PROVIDERS: CloudProvider[] = [
  {
    id: "azure",
    name: "Microsoft Azure",
    shortName: "Azure",
    color: "#0078d4",
    badgeBg: "bg-[#0078d4]",
    badgeText: "Az",
    status: "active",
    certCount: 6,
    activeCount: 1,
    description: "Colecciones editoriales para certificaciones Microsoft Azure. Proveedor activo.",
    href: "/azure",
  },
  {
    id: "aws",
    name: "Amazon Web Services",
    shortName: "AWS",
    color: "#FF9900",
    badgeBg: "bg-orange-400",
    badgeText: "AW",
    status: "planned",
    certCount: 0,
    activeCount: 0,
    description: "Colecciones para certificaciones AWS. En hoja de ruta.",
    href: null,
  },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    shortName: "GCP",
    color: "#4285F4",
    badgeBg: "bg-blue-400",
    badgeText: "GC",
    status: "planned",
    certCount: 0,
    activeCount: 0,
    description: "Colecciones para certificaciones Google Cloud. En hoja de ruta.",
    href: null,
  },
];

export default function Catalogo() {
  const [, setLocation] = useLocation();

  return (
    <CatalogLayout crumbs={[{ label: "Biblioteca" }]}>
      <div className="px-8 py-8 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Biblioteca</h1>
            <p className="text-sm text-white/40 mt-1">
              Colecciones editoriales de certificación cloud. Selecciona un proveedor para explorar sus certificaciones.
            </p>
          </div>
          <button
            disabled
            title="La creacion real de proveedores/certificaciones requiere schema persistente."
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold text-white/25 cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />Nueva coleccion
          </button>
        </div>

        {/* Providers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className={cn(
                "bg-[#0d1629] rounded-sm border flex flex-col transition-all",
                p.status === "active"
                  ? "border-white/[0.08] hover:border-white/[0.15] shadow-sm hover:shadow-md"
                  : "border-white/[0.04] opacity-60"
              )}
            >
              {/* Header */}
              <div className={cn("px-5 pt-5 pb-4 border-b",
                p.status === "active"
                  ? "bg-blue-500/5 border-white/[0.06]"
                  : "bg-white/[0.02] border-white/[0.04]")}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold text-white", p.badgeBg)}>
                    {p.badgeText}
                  </div>
                  {p.status === "planned" && <Lock className="w-3.5 h-3.5 text-white/15" />}
                  {p.status === "active" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Activo</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-white leading-tight">{p.name}</p>
                <p className="text-[10px] text-white/30 mt-1 leading-snug">{p.description}</p>
              </div>

              {/* Stats */}
              <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-white/[0.04]">
                <div>
                  <p className="text-[8px] text-white/20 uppercase tracking-wider font-medium mb-0.5">Certificaciones</p>
                  <p className="text-sm font-bold text-white/60">{p.certCount > 0 ? p.certCount : "—"}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/20 uppercase tracking-wider font-medium mb-0.5">En producción</p>
                  <p className="text-sm font-bold text-white/60">{p.activeCount > 0 ? p.activeCount : "—"}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="px-5 py-4 mt-auto">
                {p.status === "active" ? (
                  <button
                    onClick={() => p.href && setLocation(p.href)}
                    className="w-full flex items-center justify-center gap-2 h-8 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold rounded-sm transition-all shadow-sm"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Ver certificaciones
                    <ArrowRight className="w-3 h-3 ml-auto" />
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center h-8 bg-white/[0.03] text-white/15 text-xs font-medium rounded-sm cursor-not-allowed gap-1.5 border border-white/[0.04]">
                    <Lock className="w-3 h-3" />
                    Próximamente
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modelo editorial */}
        <div className="border border-dashed border-white/[0.08] rounded-sm px-5 py-4">
          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Modelo editorial</p>
          <div className="flex items-center gap-2 flex-wrap">
            {["Proveedor Cloud", "Certificación", "Colección editorial", "Formato de estudio", "Infografía / Módulo", "Output"].map((item, i, arr) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-[9px] text-white/50 bg-white/[0.05] px-2 py-0.5 rounded-sm font-medium">{item}</span>
                {i < arr.length - 1 && <span className="text-white/15 text-[10px]">›</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </CatalogLayout>
  );
}
