import { useGetContract, useUpdateContract, getGetContractQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { ShieldAlert, Sparkles, Layers, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contrato() {
  const { data: contract, isLoading } = useGetContract();
  const updateContract = useUpdateContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return (
    <Layout title="Contrato Visual">
      <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </Layout>
  );

  if (!contract) return (
    <Layout title="Contrato Visual">
      <div className="p-6 text-sm text-gray-500">Contrato no encontrado.</div>
    </Layout>
  );

  return (
    <Layout title="Contrato Visual">
      {/* Version header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Versión activa:</span>
          <span className="bg-[#0d1629] text-white text-xs font-bold px-2 py-0.5 rounded-sm">{contract.version}</span>
        </div>
        <span className="text-xs text-gray-400">Actualizado: {formatDate(contract.updatedAt)}</span>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => {
              updateContract.mutate({
                data: { changeNote: "Revisión menor de consistencia iconográfica", version: contract.version }
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetContractQueryKey() });
                  toast({ title: "Contrato actualizado" });
                }
              });
            }}
          >
            Registrar cambio
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-5">
        {/* No negociable */}
        <ContractSection
          title="Reglas No Negociables"
          icon={ShieldAlert}
          iconColor="text-red-500"
          borderColor="border-red-200"
          headerBg="bg-red-50"
          items={contract.nonNegotiable as string[]}
          bulletColor="bg-red-400"
        />

        {/* Storytelling flexible */}
        <ContractSection
          title="Storytelling Flexible"
          icon={Sparkles}
          iconColor="text-teal-600"
          borderColor="border-teal-200"
          headerBg="bg-teal-50"
          items={contract.flexibleStorytelling as string[]}
          bulletColor="bg-teal-400"
        />

        {/* Componentes estables */}
        <ContractSection
          title="Componentes Estables"
          icon={Layers}
          iconColor="text-blue-600"
          borderColor="border-blue-200"
          headerBg="bg-blue-50"
          items={contract.stableComponents as string[]}
          bulletColor="bg-blue-400"
        />

        {/* Changelog — full width */}
        <div className="col-span-3">
          <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Registro de Cambios</p>
            </div>
            <div className="divide-y divide-gray-50">
              {(contract.changelog as Array<{version: string; note: string; at: string}>)
                .slice()
                .reverse()
                .map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-4" data-testid={`changelog-entry-${i}`}>
                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-sm shrink-0">{entry.version}</span>
                    <p className="text-xs text-gray-700 flex-1">{entry.note}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatDate(entry.at)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Editorial rules footer */}
      <div className="mx-6 mb-6 border border-dashed border-gray-200 rounded-sm p-4 bg-gray-50">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Reglas editoriales de referencia QA</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            "Consistencia iconografica — un icono por concepto, nunca dos para el mismo termino",
            "Cero solapamiento de elementos — separacion minima 8px",
            "Jerarquia tipografica: Titulo > Subtitulo > Cuerpo",
            "Densidad controlada — maximo 6 conceptos por pagina",
            "Trampa de examen destacada con borde rojo en todas las paginas",
            "Autocheck siempre presente — pregunta + respuesta + explicacion",
            "Storytelling variable pero identidad estable entre paginas",
            "Fuente Microsoft Learn citada al pie con URL completa",
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-[10px] text-gray-500">{rule}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function ContractSection({ title, icon: Icon, iconColor, borderColor, headerBg, items, bulletColor }: {
  title: string; icon: any; iconColor: string; borderColor: string; headerBg: string;
  items: string[]; bulletColor: string;
}) {
  return (
    <div className={`bg-white border rounded-sm overflow-hidden ${borderColor}`}>
      <div className={`px-4 py-3 border-b ${borderColor} ${headerBg} flex items-center gap-2`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-xs font-semibold text-gray-800">{title}</p>
        <span className="ml-auto text-[10px] text-gray-400 bg-white rounded-sm px-1.5 py-0.5">{items.length}</span>
      </div>
      <ul className="px-4 py-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${bulletColor} mt-1.5 shrink-0`} />
            <p className="text-xs text-gray-700 leading-snug">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
