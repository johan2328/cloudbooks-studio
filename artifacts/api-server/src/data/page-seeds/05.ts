import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../domain/editorial-contracts/visual-atlas-v24";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "05",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Networking en ACR",
  subtitle: "Private endpoints y firewall",
  context: "El acceso de red a ACR se gobierna con reglas de firewall, endpoints privados, DNS privado y configuraciones de acceso publico. Private Endpoint crea una IP privada en la VNet; Service Endpoint restringe origen, pero no convierte ACR en un recurso privado dentro de la red.",
  guideQuestion: "Si el pull falla hacia un ACR privado, que revisas antes de permisos de imagen?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de red ACR con private endpoint, private DNS, firewall, cliente y ruta privada",
  traps: [
    {
      wrong: "Private Endpoint y Service Endpoint son lo mismo",
      correction: "Private Endpoint crea una IP privada para ACR. Service Endpoint solo restringe acceso desde subredes seleccionadas.",
    },
    {
      wrong: "El error 403 siempre es de rol",
      correction: "En ACR privado puede ser red, firewall o DNS. Primero separa autenticacion, autorizacion y conectividad.",
    },
    {
      wrong: "DNS privado se configura solo",
      correction: "El cliente debe resolver el endpoint de ACR hacia la IP privada correcta mediante Private DNS Zone o resolucion equivalente.",
    },
  ],
  autocheck: {
    question: "AKS tiene AcrPull, pero el pull a ACR privado falla por timeout. Que capa revisas primero?",
    options: ["A. Tag de imagen", "B. DNS privado/ruta a Private Endpoint", "C. AcrPush", "D. Retention policy"],
    correctOption: 1,
    explanation: "Timeout con permisos correctos apunta a conectividad: DNS privado, Private Endpoint, firewall o rutas de red.",
    discardNotes: [
      "A descartada: un tag mal escrito suele dar error de imagen no encontrada, no timeout de red.",
      "C descartada: AcrPush no se necesita para descargar imagenes.",
      "D descartada: retention policy no controla conectividad.",
    ],
  },
  contractVersion: VISUAL_ATLAS_V24_CONTRACT.version,
  visualModules: [
    {
      num: "01",
      title: "Acceso publico",
      description: "Public endpoint can be open or restricted with firewall rules and trusted Azure service options.",
    },
    {
      num: "02",
      title: "Private Endpoint",
      description: "Private Link places ACR behind a private IP in the VNet and requires Premium tier for private access patterns.",
    },
    {
      num: "03",
      title: "DNS privado",
      description: "Clients must resolve registry login server to the private endpoint IP; DNS mistakes create common pull failures.",
    },
    {
      num: "04",
      title: "Diagnostico",
      description: "Separate identity, role, DNS, firewall and routing signals before changing image tags or registry tiers.",
    },
  ],
};

export default seed;
