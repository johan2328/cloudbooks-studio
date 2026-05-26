import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../domain/editorial-contracts/visual-atlas-v24";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "09",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Importacion y transferencia",
  subtitle: "Registros, artefactos y entornos aislados",
  context: "ACR permite mover imagenes entre registros con az acr import, exportar artefactos y soportar escenarios conectados o desconectados. La trampa habitual es confundir pull/push desde un cliente con operaciones registry-to-registry o transferencia para entornos air-gapped.",
  guideQuestion: "Como copias una imagen desde otro registro hacia ACR sin hacer pull local y push manual?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de transferencia ACR con az acr import, export, connected registry y entorno air-gapped",
  traps: [
    {
      wrong: "Import es lo mismo que docker pull",
      correction: "az acr import opera a nivel de registro y evita descargar la imagen localmente antes de copiarla.",
    },
    {
      wrong: "Connected registry funciona en cualquier tier",
      correction: "Connected registry esta orientado a escenarios avanzados y requiere revisar restricciones de tier y configuracion especifica.",
    },
    {
      wrong: "Export deja la imagen lista en Kubernetes",
      correction: "Export produce artefactos transferibles; aun debes cargarlos o importarlos donde corresponda.",
    },
  ],
  autocheck: {
    question: "Quieres copiar una imagen de Docker Hub a ACR sin descargarla localmente. Que usas?",
    options: ["A. az acr import", "B. docker pull", "C. AcrPull", "D. Retention policy"],
    correctOption: 0,
    explanation: "az acr import copia imagenes desde otro registro hacia ACR como operacion del registro.",
    discardNotes: [
      "B descartada: pull descarga al cliente local.",
      "C descartada: AcrPull es permiso, no accion de copia registry-to-registry.",
      "D descartada: retention policy limpia manifests, no importa imagenes.",
    ],
  },
  contractVersion: VISUAL_ATLAS_V24_CONTRACT.version,
  visualModules: [
    {
      num: "01",
      title: "Import",
      description: "az acr import copies image content from an external registry into ACR without local pull and push.",
    },
    {
      num: "02",
      title: "Export",
      description: "Export creates transferable artifacts for isolated environments or controlled movement between boundaries.",
    },
    {
      num: "03",
      title: "Connected registry",
      description: "Connected registry supports distributed and intermittently connected scenarios where local registry access is required.",
    },
    {
      num: "04",
      title: "Air-gapped",
      description: "Offline environments require explicit artifact movement, validation and import steps rather than normal internet pulls.",
    },
  ],
};

export default seed;
