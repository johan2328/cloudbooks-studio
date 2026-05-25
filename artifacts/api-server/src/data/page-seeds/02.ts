import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "02",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Build y push hacia ACR",
  subtitle: "Local, nube y automatizacion",
  context: "Publicar imagenes en Azure Container Registry puede hacerse desde Docker local, desde Azure con az acr build o mediante ACR Tasks. La clave de examen es distinguir donde se ejecuta el build, que identidad tiene permiso AcrPush y cuando conviene evitar dependencia de Docker local.",
  guideQuestion: "Si no tienes Docker local, que mecanismo permite construir y publicar una imagen directamente en ACR?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Flujo comparativo de build local, az acr build y ACR Tasks hacia Azure Container Registry",
  traps: [
    {
      wrong: "Siempre necesitas Docker local",
      correction: "az acr build construye la imagen en Azure y la publica en ACR sin requerir Docker instalado en la maquina local.",
    },
    {
      wrong: "AcrPull permite hacer push",
      correction: "AcrPull solo descarga imagenes. Para publicar se requiere AcrPush o un rol con permisos equivalentes sobre el registro.",
    },
    {
      wrong: "Build y push son la misma operacion",
      correction: "Build crea la imagen; push la sube al registro. ACR Tasks puede orquestar ambas, pero siguen siendo responsabilidades distintas.",
    },
  ],
  autocheck: {
    question: "Quieres construir una imagen sin Docker local y dejarla publicada en ACR. Que comando revisas primero?",
    options: ["A. docker push", "B. az acr build", "C. az acr import", "D. az acr login"],
    correctOption: 1,
    explanation: "az acr build ejecuta el build en Azure usando el contexto de codigo y publica la imagen resultante en ACR.",
    discardNotes: [
      "A descartada: docker push sube una imagen existente, no la construye en Azure.",
      "C descartada: import copia imagenes entre registros, no compila codigo.",
      "D descartada: login autentica, pero no construye ni publica por si solo.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Build local",
      description: "Developer runs docker build, authenticates with az acr login, then docker push sends tagged image to Azure Container Registry.",
    },
    {
      num: "02",
      title: "Build en Azure",
      description: "az acr build uploads source context to Azure, builds in the cloud, and stores the image directly in ACR without local Docker.",
    },
    {
      num: "03",
      title: "Permisos",
      description: "Pipeline identity, service principal or managed identity needs AcrPush for publishing and AcrPull for runtime consumption.",
    },
    {
      num: "04",
      title: "ACR Tasks",
      description: "Triggered or scheduled tasks automate builds from source commits, base image updates, or multi-step YAML workflows.",
    },
  ],
};

export default seed;
