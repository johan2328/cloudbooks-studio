import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "10",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Retencion y ciclo de vida",
  subtitle: "Limpieza segura de artefactos",
  context: "Las politicas de retencion y tareas de purga ayudan a controlar crecimiento del registro. Retention policy se enfoca en manifests sin tag, mientras purge tasks pueden limpiar imagenes antiguas por filtros de repositorio, tag y edad. El examen distingue limpieza automatica de versionado reproducible.",
  guideQuestion: "Que mecanismo elimina manifests sin tag despues de un periodo definido?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de ciclo de vida ACR con manifests sin tag, retention policy, purge task y repositorios limpios",
  traps: [
    {
      wrong: "Retention policy elimina imagenes con tag activo",
      correction: "La retencion se orienta a manifests sin tag. Imagenes etiquetadas requieren reglas o tareas especificas de limpieza.",
    },
    {
      wrong: "Purge task no necesita programacion",
      correction: "Purge suele ejecutarse como tarea programada o automatizada para mantener limpieza continua.",
    },
    {
      wrong: "Limpiar tags mejora reproducibilidad",
      correction: "La limpieza controla almacenamiento; reproducibilidad depende de digest, versionado y politicas de publicacion.",
    },
  ],
  autocheck: {
    question: "Quieres eliminar automaticamente manifests sin tag luego de N dias. Que capacidad revisas?",
    options: ["A. Retention policy", "B. Geo-replication", "C. AcrPush", "D. latest tag"],
    correctOption: 0,
    explanation: "Retention policy permite eliminar manifests sin tag despues del periodo configurado.",
    discardNotes: [
      "B descartada: geo-replication distribuye imagenes entre regiones.",
      "C descartada: AcrPush permite publicar, no limpiar.",
      "D descartada: latest es un tag mutable.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Manifest sin tag",
      description: "Untagged manifests remain in storage after tag changes or deletions and can accumulate silently.",
    },
    {
      num: "02",
      title: "Retention policy",
      description: "Policy removes untagged manifests after a configured number of days to reduce storage clutter.",
    },
    {
      num: "03",
      title: "Purge task",
      description: "Scheduled purge commands can remove old images by repository, tag pattern and age filters.",
    },
    {
      num: "04",
      title: "Control seguro",
      description: "Lifecycle cleanup must preserve production references and avoid deleting images still required by deployments.",
    },
  ],
};

export default seed;
