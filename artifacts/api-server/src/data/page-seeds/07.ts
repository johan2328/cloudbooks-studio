import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "07",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Geo-replicacion en ACR",
  subtitle: "Latencia global y alta disponibilidad",
  context: "Geo-replicacion sincroniza un registro Premium entre regiones Azure para reducir latencia de pull y mejorar continuidad regional. No debe confundirse con zone redundancy, que protege dentro de una misma region. En preguntas de examen, multiples regiones casi siempre apuntan a Premium.",
  guideQuestion: "Que caracteristica usas para acercar imagenes a consumidores en varias regiones?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Mapa de geo-replicacion ACR Premium con replicas regionales, routing y diferencia con zone redundancy",
  traps: [
    {
      wrong: "Geo-replicacion existe en Basic o Standard",
      correction: "Geo-replicacion es una capacidad de Premium. Basic y Standard no cubren este requisito.",
    },
    {
      wrong: "Zone redundancy replica entre regiones",
      correction: "Zone redundancy opera dentro de una region entre zonas de disponibilidad. Geo-replicacion replica entre regiones.",
    },
    {
      wrong: "La replica es instantanea en todos los casos",
      correction: "Hay sincronizacion entre replicas; para escenarios criticos se debe considerar latencia de replicacion y consistencia operacional.",
    },
  ],
  autocheck: {
    question: "Una empresa despliega en East US, West Europe y Southeast Asia y quiere pulls de baja latencia. Que seleccionas?",
    options: ["A. Basic", "B. Standard", "C. Premium con geo-replicacion", "D. Retention policy"],
    correctOption: 2,
    explanation: "Premium habilita geo-replicacion para distribuir el registro entre regiones y acercar el pull a los consumidores.",
    discardNotes: [
      "A descartada: Basic no soporta geo-replicacion.",
      "B descartada: Standard no soporta geo-replicacion.",
      "D descartada: retention policy gestiona limpieza, no distribucion regional.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Replica regional",
      description: "Premium registry can replicate images to multiple Azure regions for closer pulls and regional continuity.",
    },
    {
      num: "02",
      title: "Routing",
      description: "Clients use the registry login server while Azure routes pulls to an appropriate regional replica.",
    },
    {
      num: "03",
      title: "Zonas vs regiones",
      description: "Zone redundancy protects within one region; geo-replication distributes across multiple regions.",
    },
    {
      num: "04",
      title: "Decision Premium",
      description: "If the scenario combines multiple regions, private endpoint or high availability signals, Premium is the likely answer.",
    },
  ],
};

export default seed;
