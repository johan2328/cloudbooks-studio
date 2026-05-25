import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel:    "Dominio 1 — Soluciones contenerizadas en Azure",
  pageNumber:     "01",
  totalPages:     61,
  batchLabel:     "Batch 01",
  title:          "Azure Container Registry",
  subtitle:       "Arquitectura y Tiers",
  context:        "Azure Container Registry (ACR) es el registro privado de imágenes de contenedor en Azure, base para despliegues en AKS, App Service y Container Apps. Conoce sus tiers para seleccionar el adecuado según escenarios de desarrollo, producción y alta disponibilidad. Lee las señales: geo-replicación, Private Endpoint y digest suelen decidir más que el nombre del SKU.",
  guideQuestion:  "¿Cuál tier de ACR es adecuado para producción con geo-replicación y private endpoints?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de arquitectura y tiers de Azure Container Registry",
  traps: [
    {
      wrong:      "Basic es suficiente para producción",
      correction: "Basic carece de Private Endpoints y geo-replicación. Para producción con seguridad de red y HA global se requiere Premium.",
    },
    {
      wrong:      "La tag :latest siempre es segura e inmutable",
      correction: "La tag :latest es mutable — puede apuntar a imágenes distintas en cada push. Usa el digest SHA256 para referencias inmutables.",
    },
    {
      wrong:      "Geo-replication y zone redundancy son equivalentes",
      correction: "Geo-replication replica entre regiones (latencia global). Zone redundancy protege contra fallas de zonas dentro de una región. Son independientes y complementarios.",
    },
  ],
  autocheck: {
    question:      "¿Qué tier de ACR permite geo-replication y private endpoints simultáneamente?",
    options:       ["A. Basic", "B. Standard", "C. Premium", "D. Enterprise"],
    correctOption: 2,
    explanation:   "Premium es el único tier con geo-replication activa-activa y soporte de Private Endpoints/Private Link para acceso de red privado.",
    discardNotes:  [
      "A descartada: Basic no tiene Private Endpoints ni geo-replication.",
      "B descartada: Standard tiene Content Trust pero no geo-replication.",
      "D descartada: No existe tier Enterprise en ACR.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num:         "01",
      title:       "Qué es ACR",
      description: "Developer pipeline pushing to Azure Container Registry, consumed by AKS, App Service and Container Apps. Private registry concept vs Docker Hub.",
    },
    {
      num:         "02",
      title:       "Tiers ACR",
      description: "Basic / Standard / Premium side-by-side: storage limits, webhooks, content trust, geo-replication availability, private endpoint support, zone redundancy.",
    },
    {
      num:         "03",
      title:       "Arquitectura interna",
      description: "Registry contains Repositories, each with Images identified by tag (mutable) and digest SHA256 (immutable). Content trust and signing flow.",
    },
    {
      num:         "04",
      title:       "Geo-replicación",
      description: "Multi-region map with active-active replication arrows. Zone redundancy within a region (availability zones). Use case: global latency reduction.",
    },
  ],
};

export default seed;
