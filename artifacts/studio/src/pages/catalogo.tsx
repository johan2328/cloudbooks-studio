import { useLocation } from "wouter";
import CatalogLayout from "@/components/CatalogLayout";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock, Cloud } from "lucide-react";

interface CloudProvider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  borderColor: string;
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
    bgColor: "bg-[#0078d4]/8",
    borderColor: "border-[#0078d4]/25",
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
    bgColor: "bg-orange-50/50",
    borderColor: "border-orange-200/40",
    badgeBg: "bg-orange-400/60",
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
    bgColor: "bg-blue-50/40",
    borderColor: "border-blue-200/30",
    badgeBg: "bg-blue-400/50",
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
    <CatalogLayout crumbs={[{ label: "CloudBooks Library" }]}>
      <div className="px-8 py-8 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">CloudBooks Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Biblioteca editorial de certificaciones cloud. Selecciona un proveedor para explorar sus colecciones.
          </p>
        </div>

        {/* Providers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className={cn(
                "bg-white rounded-sm border flex flex-col transition-all",
                p.status === "active"
                  ? `${p.borderColor} shadow-sm hover:shadow-md`
                  : "border-gray-200 opacity-60"
              )}
            >
              {/* Header */}
              <div className={cn("px-5 pt-5 pb-4 border-b", p.status === "active" ? `${p.bgColor} border-${p.borderColor}` : "bg-gray-50/60 border-gray-100")}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold text-white", p.badgeBg)}>
                    {p.badgeText}
                  </div>
                  {p.status === "planned" && <Lock className="w-3.5 h-3.5 text-gray-300" />}
                  {p.status === "active" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Activo</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 leading-tight">{p.name}</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-snug">{p.description}</p>
              </div>

              {/* Stats */}
              <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-gray-100">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">Certificaciones</p>
                  <p className="text-sm font-bold text-gray-700">{p.certCount > 0 ? p.certCount : "—"}</p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">En producción</p>
                  <p className="text-sm font-bold text-gray-700">{p.activeCount > 0 ? p.activeCount : "—"}</p>
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
                  <div className="w-full flex items-center justify-center h-8 bg-gray-100 text-gray-400 text-xs font-medium rounded-sm cursor-not-allowed gap-1.5">
                    <Lock className="w-3 h-3" />
                    Próximamente
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modelo editorial */}
        <div className="border border-dashed border-gray-200 rounded-sm px-5 py-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Modelo editorial CloudBooks</p>
          <div className="flex items-center gap-2 flex-wrap">
            {["Proveedor Cloud", "Certificación", "Colección editorial", "Formato de estudio", "Infografía / Módulo", "Output"].map((item, i, arr) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm font-medium">{item}</span>
                {i < arr.length - 1 && <span className="text-gray-300 text-[10px]">›</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </CatalogLayout>
  );
}
