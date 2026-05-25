import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { TEMPLATE_VERSION } from "../../config/generation";

const seed: VisualAtlasPageData = {
  domainLabel: "Dominio 1 - Soluciones contenerizadas en Azure",
  pageNumber: "03",
  totalPages: 61,
  batchLabel: "Batch 01",
  title: "Tags y digest SHA256",
  subtitle: "Trazabilidad reproducible",
  context: "Los tags ayudan a nombrar versiones de imagen, pero pueden moverse. El digest SHA256 identifica de forma inmutable el contenido exacto de una imagen. En preguntas de certificacion, reproducibilidad, auditoria y version exacta suelen apuntar a digest, no a latest.",
  guideQuestion: "Que referencia garantiza que una carga use exactamente la misma imagen cada vez?",
  upperVisualSrc: "placeholder",
  upperVisualAlt: "Diagrama de tags mutables, digest SHA256 inmutable y trazabilidad de imagenes en ACR",
  traps: [
    {
      wrong: "latest garantiza version exacta",
      correction: "latest es un tag mutable. Puede cambiar con cada push y no prueba que el contenido sea el mismo.",
    },
    {
      wrong: "Un tag semantico siempre es inmutable",
      correction: "1.2.3 comunica intencion, pero solo es inmutable si el proceso bloquea sobrescritura o se referencia por digest.",
    },
    {
      wrong: "Digest y manifest son sinonimos",
      correction: "El manifest describe capas y metadata; el digest es el hash inmutable que referencia ese contenido exacto.",
    },
  ],
  autocheck: {
    question: "Para desplegar siempre la misma imagen auditada en produccion, que referencia deberias usar?",
    options: ["A. :latest", "B. :prod", "C. SHA256 digest", "D. Nombre del repositorio"],
    correctOption: 2,
    explanation: "El digest SHA256 apunta al contenido exacto de la imagen y evita que una etiqueta mutable cambie el artefacto desplegado.",
    discardNotes: [
      "A descartada: latest puede moverse.",
      "B descartada: prod tambien es un tag mutable si no se gobierna.",
      "D descartada: el repositorio agrupa imagenes, no identifica una version exacta.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
  visualModules: [
    {
      num: "01",
      title: "Tag mutable",
      description: "Labels such as latest, prod, or 1.2.3 point to an image version but can be overwritten by later pushes.",
    },
    {
      num: "02",
      title: "Digest exacto",
      description: "SHA256 digest references immutable image content and is the safest production pointer for reproducible deployments.",
    },
    {
      num: "03",
      title: "Manifest",
      description: "Image manifest connects config, layers, architecture and OS metadata; its content is represented by a digest.",
    },
    {
      num: "04",
      title: "Decision de examen",
      description: "If the scenario says audit, reproducibility, exact version or supply chain, choose digest over mutable tags.",
    },
  ],
};

export default seed;
