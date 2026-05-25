import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "06",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "ACR Tasks",
  subtitle: "Builds automaticos y mantenimiento",
  context: "ACR Tasks automatiza builds en Azure: quick tasks para ejecuciones puntuales, triggered tasks ante commits o cambios de imagen base, scheduled tasks para mantenimiento y multi-step tasks para flujos YAML. La clave es diferenciar automatizacion de registro frente a un pipeline CI/CD completo.",
  guideQuestion: "Que capacidad de ACR recompila automaticamente cuando cambia la imagen base?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de ACR Tasks con quick task, trigger por commit, trigger por base image, schedule y multi-step YAML",
  traps: [
    {
      wrong: "ACR Tasks reemplaza todo CI/CD",
      correction: "Automatiza builds y tareas del registro, pero no sustituye necesariamente pruebas, aprobaciones, despliegues y gobernanza del pipeline completo.",
    },
    {
      wrong: "Quick task queda programada",
      correction: "Quick task ejecuta una vez. Para repeticion necesitas triggered task o scheduled task.",
    },
    {
      wrong: "Base image trigger es manual",
      correction: "Puede dispararse automaticamente cuando se actualiza la imagen base, ayudando a rebuilds de seguridad.",
    },
  ],
  autocheck: {
    question: "Quieres rebuild automatico cuando una imagen base recibe parche de seguridad. Que revisas?",
    options: ["A. Quick task", "B. Base image update trigger", "C. docker push manual", "D. AcrPull"],
    correctOption: 1,
    explanation: "Base image update trigger permite reconstruir imagenes dependientes cuando cambia la imagen base.",
    discardNotes: [
      "A descartada: quick task es puntual.",
      "C descartada: manual no cumple automatizacion.",
      "D descartada: AcrPull solo descarga imagenes.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Quick task",
      description: "One-off cloud build using az acr build; useful for fast build and push without creating persistent automation.",
    },
    {
      num: "02",
      title: "Triggers",
      description: "Source commit, base image update and schedules can start registry-side automation without manual execution.",
    },
    {
      num: "03",
      title: "Multi-step YAML",
      description: "Complex workflows define multiple build, test, tag and push steps in a task file.",
    },
    {
      num: "04",
      title: "Mantenimiento",
      description: "Tasks can run purge or lifecycle commands on schedules to keep repositories clean and predictable.",
    },
  ],
};

export default seed;
