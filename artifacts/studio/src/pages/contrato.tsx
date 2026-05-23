import { useGetContract, useUpdateContract, getGetContractQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { ShieldAlert, Sparkles, Layers, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Contrato() {
  const { data: contract, isLoading } = useGetContract();
  const updateContract = useUpdateContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return (
    <Layout title="Contrato Visual">
      <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</div>
    </Layout>
  );

  if (!contract) return (
    <Layout title="Contrato Visual">
      <div className="p-6 text-sm text-gray-500">Contrato no encontrado.</div>
    </Layout>
  );

  const changelog = contract.changelog as Array<{version: string; note: string; at: string}>;

  return (
    <Layout title="Contrato Visual — AI-200 Visual Study Atlas">
      {/* Version header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Versión activa</span>
          <span className="bg-[#0d1629] text-white text-xs font-bold px-2.5 py-0.5 rounded-sm">{contract.version}</span>
        </div>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-400">Actualizado: {formatDate(contract.updatedAt)}</span>
        <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-2.5 py-0.5">
          <Star className="w-3 h-3" />
          Score red team objetivo ≥ 9.5 / 10 antes de producción
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" className="text-xs h-7"
            onClick={() => {
              updateContract.mutate(
                { data: { changeNote: "Ajuste menor de reglas de composición visual", version: contract.version } },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetContractQueryKey() });
                    toast({ title: "Contrato actualizado", description: "Cambio registrado en el changelog." });
                  }
                }
              );
            }}>
            Registrar revisión
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* 3-column rules grid */}
        <div className="grid grid-cols-3 gap-4">
          <ContractSection
            title="No Negociable"
            subtitle="Reglas inamovibles — cualquier desviación bloquea aprobación"
            icon={ShieldAlert} iconColor="text-red-500"
            borderColor="border-red-200" headerBg="bg-red-50"
            items={contract.nonNegotiable as string[]}
            bulletColor="bg-red-400" textColor="text-red-800"
          />
          <ContractSection
            title="Storytelling Flexible"
            subtitle="La narrativa visual puede y debe adaptarse al concepto"
            icon={Sparkles} iconColor="text-teal-600"
            borderColor="border-teal-200" headerBg="bg-teal-50"
            items={contract.flexibleStorytelling as string[]}
            bulletColor="bg-teal-400" textColor="text-teal-800"
          />
          <ContractSection
            title="Componentes Estables"
            subtitle="Zonas fijas de la página — estructura visual del atlas"
            icon={Layers} iconColor="text-blue-600"
            borderColor="border-blue-200" headerBg="bg-blue-50"
            items={contract.stableComponents as string[]}
            bulletColor="bg-blue-400" textColor="text-blue-800"
          />
        </div>

        {/* Defect taxonomy */}
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Taxonomía de defectos controlados por QA</p>
            <p className="text-[10px] text-gray-400 mt-0.5">El sistema marca como "requiere corrección" cuando cualquiera de estos defectos es detectado</p>
          </div>
          <div className="grid grid-cols-4 gap-0 divide-x divide-gray-100">
            {[
              { label: "Varianza iconográfica", desc: "Iconos de distinta familia visual en una misma página" },
              { label: "Alteración tipográfica", desc: "Tamaños o pesos que rompen la jerarquía establecida" },
              { label: "Duplicación de etiquetas", desc: "Un concepto aparece dos veces con nombres distintos" },
              { label: "Huecos no informativos", desc: "Espacio vacío sin propósito narrativo justificado" },
              { label: "Título compite con diagrama", desc: "El título visual eclipsa al diagrama o al revés" },
              { label: "Recorte de elementos", desc: "Texto o iconos cortados por los bordes de la página" },
              { label: "Incoherencia cromática", desc: "Colores fuera del sistema de paleta del atlas" },
              { label: "Autocheck repetido", desc: "La respuesta correcta es idéntica a una opción incorrecta" },
            ].map((d, i) => (
              <div key={i} className="px-3 py-3">
                <p className="text-[10px] font-semibold text-gray-800 mb-0.5">{d.label}</p>
                <p className="text-[9px] text-gray-400 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Changelog */}
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Registro de cambios del contrato</p>
            <span className="ml-auto text-[10px] text-gray-400">{changelog.length} versiones</span>
          </div>
          <div className="divide-y divide-gray-50">
            {changelog.slice().reverse().map((entry, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-4" data-testid={`changelog-entry-${i}`}>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 font-bold",
                  i === 0 ? "bg-[#0d1629] text-white" : "bg-gray-100 text-gray-600"
                )}>{entry.version}</span>
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">{entry.note}</p>
                <span className="text-[10px] text-gray-400 shrink-0">{formatDate(entry.at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Production criteria */}
        <div className="bg-[#0d1629] rounded-sm px-5 py-4">
          <p className="text-xs font-bold text-white mb-3 uppercase tracking-widest">Criterios de producción</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Score QA mínimo", value: "95 / 100", color: "text-green-400" },
              { label: "Score Red Team mínimo", value: "9.5 / 10", color: "text-teal-400" },
              { label: "Defectos críticos", value: "0 detectados", color: "text-amber-400" },
            ].map((c, i) => (
              <div key={i}>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">{c.label}</p>
                <p className={cn("text-lg font-black mt-0.5", c.color)}>{c.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-3 border-t border-white/10 pt-3">
            "Solo pasaremos a producción cuando el red team humano alcance 9.5" — Directora Editorial
          </p>
        </div>
      </div>
    </Layout>
  );
}

function ContractSection({ title, subtitle, icon: Icon, iconColor, borderColor, headerBg, items, bulletColor, textColor }: {
  title: string; subtitle: string; icon: any; iconColor: string; borderColor: string; headerBg: string;
  items: string[]; bulletColor: string; textColor: string;
}) {
  return (
    <div className={cn("bg-white border rounded-sm overflow-hidden", borderColor)}>
      <div className={cn("px-4 py-3 border-b", borderColor, headerBg)}>
        <div className="flex items-center gap-2 mb-0.5">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />
          <p className="text-xs font-bold text-gray-800">{title}</p>
          <span className="ml-auto text-[10px] bg-white/80 rounded-sm px-1.5 py-0.5 font-semibold text-gray-500">{items.length}</span>
        </div>
        <p className="text-[9px] text-gray-500 leading-tight">{subtitle}</p>
      </div>
      <ul className="px-4 py-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", bulletColor)} />
            <p className="text-[10px] text-gray-700 leading-snug">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
