import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../domain/editorial-contracts/visual-atlas-v24";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "04",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Autenticacion en ACR",
  subtitle: "Identidades, tokens y roles",
  context: "ACR acepta varios metodos de autenticacion segun el actor: usuario administrador para pruebas, service principal para automatizacion tradicional, managed identity para recursos Azure y tokens de repositorio para alcance granular. En produccion, el examen premia menor privilegio y rotacion segura.",
  guideQuestion: "Que identidad conviene para que un recurso Azure haga pull desde ACR sin guardar secretos?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Mapa de autenticacion ACR con admin user, service principal, managed identity, repository tokens y roles AcrPull/AcrPush",
  traps: [
    {
      wrong: "Admin user es ideal para produccion",
      correction: "Admin user es simple pero amplio y compartido. Para produccion se prefieren identidades y RBAC con menor privilegio.",
    },
    {
      wrong: "AcrPull y AcrPush son equivalentes",
      correction: "AcrPull descarga imagenes; AcrPush publica imagenes. Asignar ambos sin necesidad aumenta superficie de riesgo.",
    },
    {
      wrong: "Managed identity funciona desde cualquier lugar",
      correction: "Managed identity aplica a recursos Azure compatibles. Para agentes externos suele usarse service principal u OIDC federation.",
    },
  ],
  autocheck: {
    question: "Un AKS debe descargar imagenes privadas de ACR sin almacenar secretos. Que enfoque revisas?",
    options: ["A. Admin user", "B. Managed identity con AcrPull", "C. Password de registro", "D. Token local Docker"],
    correctOption: 1,
    explanation: "Managed identity permite autenticar recursos Azure contra ACR y AcrPull limita el permiso a descarga de imagenes.",
    discardNotes: [
      "A descartada: admin user es amplio y no recomendado para produccion.",
      "C descartada: guardar passwords aumenta riesgo operacional.",
      "D descartada: token local no es una estrategia robusta para AKS.",
    ],
  },
  contractVersion: VISUAL_ATLAS_V24_CONTRACT.version,
  visualModules: [
    {
      num: "01",
      title: "Actores",
      description: "Developer, CI/CD pipeline, AKS, App Service and Container Apps authenticate differently depending on automation and runtime context.",
    },
    {
      num: "02",
      title: "Roles ACR",
      description: "AcrPull for runtime pulls, AcrPush for publishing, AcrDelete for cleanup; least privilege is the guiding rule.",
    },
    {
      num: "03",
      title: "Identidades",
      description: "Service principal stores credentials; managed identity avoids secrets for Azure resources; OIDC federation reduces secret rotation burden.",
    },
    {
      num: "04",
      title: "Tokens",
      description: "Repository-scoped tokens can constrain access to specific repositories and actions when granular registry access is needed.",
    },
  ],
};

export default seed;
