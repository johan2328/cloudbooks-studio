import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "08",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Seguridad de imagenes",
  subtitle: "Defender, CVE y control de riesgo",
  context: "ACR almacena imagenes, pero el analisis de vulnerabilidades se integra con Microsoft Defender for Containers y practicas de supply chain como firmas, SBOM y politicas de cuarentena. El examen suele distinguir almacenamiento de imagenes frente a evaluacion activa de seguridad.",
  guideQuestion: "Que servicio revisas para detectar vulnerabilidades CVE en imagenes almacenadas en ACR?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Flujo de seguridad de imagenes con push a ACR, escaneo Defender, CVE, firmas, SBOM y politicas de cuarentena",
  traps: [
    {
      wrong: "ACR solo ya escanea todo automaticamente",
      correction: "El escaneo de vulnerabilidades se asocia a Microsoft Defender for Containers y configuraciones de seguridad, no al almacenamiento basico por si solo.",
    },
    {
      wrong: "Firmar imagenes elimina vulnerabilidades",
      correction: "La firma mejora integridad y procedencia, pero no corrige CVE. Escaneo y remediacion siguen siendo necesarios.",
    },
    {
      wrong: "Quarantine policy es un antivirus",
      correction: "La cuarentena controla disponibilidad de imagenes bajo politicas; no reemplaza analisis ni correccion de vulnerabilidades.",
    },
  ],
  autocheck: {
    question: "Necesitas detectar CVE en imagenes de contenedor almacenadas en ACR. Que integracion buscas?",
    options: ["A. Microsoft Defender for Containers", "B. AcrPull", "C. Geo-replication", "D. Docker tag latest"],
    correctOption: 0,
    explanation: "Defender for Containers provee evaluacion de vulnerabilidades y recomendaciones sobre imagenes de contenedor.",
    discardNotes: [
      "B descartada: AcrPull es permiso de descarga.",
      "C descartada: geo-replication distribuye imagenes, no las escanea.",
      "D descartada: latest es una etiqueta mutable, no una capacidad de seguridad.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Push a ACR",
      description: "Images enter the registry from developer machines, CI/CD pipelines or cloud builds.",
    },
    {
      num: "02",
      title: "Defender",
      description: "Microsoft Defender for Containers assesses image vulnerabilities and produces findings and recommendations.",
    },
    {
      num: "03",
      title: "Supply chain",
      description: "Signing, digest pinning and SBOM strengthen provenance, traceability and auditability.",
    },
    {
      num: "04",
      title: "Controles",
      description: "Quarantine, policy gates and remediation workflows decide whether vulnerable images can progress.",
    },
  ],
};

export default seed;
