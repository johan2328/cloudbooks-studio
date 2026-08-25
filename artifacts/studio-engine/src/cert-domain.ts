import { CONFIG } from "./config.js";

/**
 * PERFIL DE DOMINIO POR CERT — centraliza lo Azure/AI-200-específico que vivía disperso en los prompts de
 * generación (autor/enriquecedor), el gate de topic-audit y los linters deterministas. AI-200 conserva su
 * texto EXACTO (byte-idéntico → mismo edHash → caché de capítulos válida); cualquier otro cert usa el perfil
 * AGNÓSTICO (sin CLI/SSH/Docker/ACR) hasta que su onboarding autoree/override el suyo. Barrido cross-cert Fase 2.
 */
export interface LintRule { re: RegExp; severity: "blocker" | "major" | "minor"; issue: string; fix: string }

export interface CertDomain {
  /** Palabra de plataforma en el rol y en "código real de …" (AI-200: "Azure"). */
  platformShort: string;
  /** Tipos de código que el enriquecedor puede agregar (AI-200: "CLI/YAML/bash/KQL"). */
  codeKinds: string;
  /** Bloque (d) SEGURIDAD del enriquecedor (AI-200: el SSH oficial de App Service + Docker! centinela). */
  security: string;
  /** Ítem 'build' de ejemplo en el user del enriquecedor (few-shot). */
  buildFewShot: string;
  /** Etiqueta de la corrección del experto en el repair ("experto Azure"). */
  repairPersona: string;
  /** System prompt del pase de reparación (libro + sintaxis de referencias de imagen). */
  repairSys: string;
  /** Few-shots del autor (valores de ejemplo dentro del JSON pedido). */
  titleProductEg: string;
  buildGoalEg: string;
  objectivesEg: string;
  prereqEg: string;
  prereqRemedyEg: string;
  precisionEg: string;
  graphicsCaptionEg: string;
  /** Capstone (capítulo integrador): ejemplo de escenario multi-restricción. */
  capstoneScenarioEg: string;
  /** Gate de verificación (experto escéptico + segundo voto): persona + ejemplos por dominio. */
  expert: string;
  expert2: string;
  wrongExamples: string;
  impreciseExamples: string;
  /** topic-audit: grupos de servicios/temas para detectar contaminación CRUZADA. */
  serviceGroups: string[][];
  auditorSys: string;
  auditorMismatchEg: string;
  /** Linters deterministas por dominio (seguridad + CLI). */
  securityLintRules: LintRule[];
  cliLintRules: LintRule[];
}

// Regla de secreto en claro genérica: aplica a CUALQUIER cert (no depende de Azure). Compartida por AI-200 y agnóstico.
const GENERIC_SECRET_RULE: LintRule = {
  re: /\b(password|passwd|secret|token)\s*[:=]\s*["']?[A-Za-z0-9!@#$%^&*_.-]{6,}/i,
  severity: "major", issue: "Secreto/credencial hardcodeado",
  fix: "Mové el secreto a un almacén seguro (Key Vault / variable de entorno); no lo pongas literal.",
};

// ─────────────────────────────── AI-200 (Azure) — byte-idéntico al histórico ───────────────────────────────
const AI200_DOMAIN: CertDomain = {
  platformShort: "Azure",
  codeKinds: "CLI/YAML/bash/KQL",
  security:
    "(d) SEGURIDAD (obligatorio): el ÚNICO password admitido es el del SSH OFICIAL de App Service para contenedores custom —`echo \"root:Docker!\" | chpasswd` con openssh-server, un `sshd_config` (Port 2222, PermitRootLogin yes, Ciphers/MACs requeridos) y `EXPOSE 2222`—; `Docker!` es un valor CENTINELA obligatorio (NO un secreto) y el 2222 es accesible SOLO por el túnel autenticado de Kudu, nunca desde internet. Si mostrás ese SSH, incluí el sshd_config y aclaralo en la prosa. FUERA de ese patrón NUNCA embebas credenciales/secretos en claro (ni un root:… distinto de Docker!, ni tokens/passwords literales, ni --docker-registry-server-password con valor): para el pull usá managed identity con AcrPull y para secretos usá Key Vault references.",
  buildFewShot:
    "{\"kind\":\"build\",\"question\":\"complete el comando/config para X\",\"template\":\"az containerapp create --name app --image [[1]] --target-port [[2]]\",\"blanks\":[{\"options\":[\"myregistry.azurecr.io/api:v1\",\"api:v1\"],\"correctIndex\":0},{\"options\":[\"8080\",\"443\"],\"correctIndex\":0}],\"explanation\":\"por qué esos valores\"}",
  repairPersona: "experto Azure",
  repairSys:
    "Eres editor técnico de un libro Azure. Un verificador experto detectó afirmaciones o código TÉCNICAMENTE INCORRECTOS en este capítulo. Reescribe ÚNICAMENTE lo necesario para que cada punto quede CORRECTO según la corrección del experto (arregla el comando/valor/sintaxis o el enunciado; si un bloque de código no se puede arreglar con certeza, reemplázalo por uno correcto más simple o quítalo). NO toques el resto del capítulo: mantén el mismo HTML, la misma estructura y la misma voz. En los bloques <pre> usa SALTOS DE LÍNEA REALES, nunca la secuencia \"\\n\" literal. SINTAXIS EXACTA: sin espacios dentro de identificadores ni referencias de imagen (registro.azurecr.io/repo@sha256:digest, NO \"registro / repo @sha256: digest\"); sin espacios sobrantes alrededor de / @ : =. Si muestras una plantilla, usa <PLACEHOLDER> pegado sin espacios. Español neutro de Latinoamérica, SIN voseo. Responde SOLO JSON con las secciones corregidas.",
  titleProductEg: "Azure Container Registry, ACR, etc.",
  buildGoalEg: "'Construirá un ACR con una imagen versionada y la desplegará en App Service con managed identity'",
  objectivesEg: "'Seleccionar el SKU de ACR según requisitos de red/throughput'; 'Diagnosticar un contenedor que no arranca siguiendo la secuencia startup→pull→health'",
  prereqEg: "'Tener a mano un Dockerfile con CMD/ENTRYPOINT', 'Haber iniciado sesión con az acr login', 'Contar con una imagen construida localmente'",
  prereqRemedyEg: "'¿Sin práctica con Docker? Repase los fundamentos de contenedores antes de seguir.'",
  precisionEg: "'creando la Web App con la imagen del registro y el plan indicados'",
  graphicsCaptionEg: "'Flujo de build en ACR Tasks: del contexto al pull por tag o digest'",
  capstoneScenarioEg: "p.ej. SKU + tags/digest + identidad/AcrPull + puerto + orden de troubleshooting) con requisitos EN TENSIÓN (coste vs geo-replicación vs red privada",
  expert: "arquitecto/ingeniero SENIOR de Azure (2026)",
  expert2: "SEGUNDO revisor senior de Azure (2026)",
  wrongExamples: "Ej: semántica de entrega mal (exactly-once donde es at-least-once, orden), 'base64 es cifrado', puerto/límite/default equivocado, HSM en el tier equivocado, modelo deprecado (text-embedding-ada-002), un comando que fallaría o borra datos.",
  impreciseExamples: "Ej: mostrar un `deploy` con un tag de imagen sin aclarar que fijar el digest (imagen@sha256:…) es más determinista; 'también existe X'; omitir un caso borde de hardening.",
  serviceGroups: [
    ["aks", "kubernetes"], ["acr", "container registry"], ["app service"], ["container apps"],
    ["cosmos"], ["postgresql", "postgres"], ["pgvector"], ["redis"], ["service bus"],
    ["event grid"], ["functions"], ["key vault"], ["app configuration"],
    ["opentelemetry"], ["azure monitor", "application insights"], ["kql", "kusto"],
  ],
  auditorSys: "Sos auditor técnico de Azure AI-200. Verificás si el CONTENIDO de una lámina trata el TEMA OFICIAL de su unidad. Devolvés SOLO JSON.",
  auditorMismatchEg: "ej: unidad de AKS o PostgreSQL pero contenido sobre Azure Container Registry",
  securityLintRules: [
    { re: /echo\s+["']?root:(?!Docker!)[^\s"'|]+["']?\s*\|\s*chpasswd/i, severity: "blocker", issue: "Contraseña root en claro embebida (distinta del centinela oficial 'Docker!' de App Service)", fix: "Para el SSH de App Service la contraseña DEBE ser exactamente root:Docker! (centinela; puerto 2222 solo-túnel). Cualquier otra es un secreto en claro → quitala." },
    { re: /--docker-registry-server-password\s+\S+/i, severity: "major", issue: "Password de registry pasada en la línea de comando", fix: "Usá managed identity con AcrPull (o Key Vault), no la contraseña en el comando." },
    { re: /\b(password|passwd|secret|token)\s*[:=]\s*["']?[A-Za-z0-9!@#$%^&*_.-]{6,}/i, severity: "major", issue: "Secreto/credencial hardcodeado", fix: "Mové el secreto a Key Vault o a una variable segura; no lo pongas literal." },
  ],
  cliLintRules: [
    { re: /--container-image-name(?![-\w])/, severity: "major", issue: "Flag inexistente en az webapp create: --container-image-name", fix: "Usá --deployment-container-image-name." },
    { re: /\[\?tags\[\?@==/, severity: "major", issue: "JMESPath anidado inválido [?tags[?@=='…']]", fix: "Usá [?contains(tags, '…')].digest." },
    { re: /az acr repository show-manifests/, severity: "minor", issue: "Comando deprecado az acr repository show-manifests", fix: "Usá az acr manifest list-metadata / az acr repository show." },
    { re: /--admin-enabled\s+true/, severity: "minor", issue: "ACR con admin user habilitado", fix: "Preferí managed identity (AcrPull); admin-enabled=false en producción." },
  ],
};

// ─────────────────────────────── AGNÓSTICO (default para certs no-Azure) ───────────────────────────────
const DEFAULT_DOMAIN: CertDomain = {
  platformShort: "la plataforma",
  codeKinds: "código, configuración o expresiones",
  security:
    "(d) SEGURIDAD (obligatorio): NUNCA embebas credenciales, secretos, connection strings ni tokens en claro. Usá el almacén de secretos o las variables de entorno de la plataforma, y las conexiones/credenciales gestionadas que ofrezca el servicio. Si un valor es sensible, referencialo desde un almacén seguro, no lo escribas literal.",
  buildFewShot:
    "{\"kind\":\"build\",\"question\":\"complete la configuración para lograr X\",\"template\":\"<fragmento con huecos> [[1]] ... [[2]]\",\"blanks\":[{\"options\":[\"valor A\",\"valor B\"],\"correctIndex\":0},{\"options\":[\"valor C\",\"valor D\"],\"correctIndex\":0}],\"explanation\":\"por qué esos valores\"}",
  repairPersona: "experto",
  repairSys:
    "Eres editor técnico de un libro de certificación. Un verificador experto detectó afirmaciones o código/configuración TÉCNICAMENTE INCORRECTOS en este capítulo. Reescribe ÚNICAMENTE lo necesario para que cada punto quede CORRECTO según la corrección del experto (arregla el comando/valor/sintaxis o el enunciado; si un bloque no se puede arreglar con certeza, reemplázalo por uno correcto más simple o quítalo). NO toques el resto del capítulo: mantén el mismo HTML, la misma estructura y la misma voz. En los bloques <pre> usa SALTOS DE LÍNEA REALES, nunca la secuencia \"\\n\" literal. SINTAXIS EXACTA: sin espacios dentro de identificadores ni rutas; sin espacios sobrantes alrededor de / @ : =. Si muestras una plantilla, usa <PLACEHOLDER> pegado sin espacios. Español neutro de Latinoamérica, SIN voseo. Responde SOLO JSON con las secciones corregidas.",
  titleProductEg: "los nombres propios de producto tal como se escriben oficialmente",
  buildGoalEg: "'Construirá y configurará el artefacto central del módulo dejándolo listo para usarse'",
  objectivesEg: "'Seleccionar la opción adecuada según los requisitos del escenario'; 'Diagnosticar una falla siguiendo una secuencia de verificación'",
  prereqEg: "'Tener a mano el insumo o artefacto que el capítulo asume', 'Haber completado el paso de configuración previo', 'Contar con el entorno o los permisos necesarios'",
  prereqRemedyEg: "'¿Sin base en el tema previo? Repase los fundamentos correspondientes antes de seguir.'",
  precisionEg: "'creando el recurso con los parámetros indicados'",
  graphicsCaptionEg: "'Flujo del proceso principal del módulo: de la entrada al resultado'",
  capstoneScenarioEg: "p.ej. combinar configuración + identidad/permisos + parámetros + orden de verificación) con requisitos EN TENSIÓN (coste vs disponibilidad vs seguridad",
  expert: "arquitecto/ingeniero técnico SENIOR de la plataforma de la certificación (2026)",
  expert2: "SEGUNDO revisor técnico senior de la plataforma de la certificación (2026)",
  wrongExamples: "Ej: una garantía de entrega o de orden mal enunciada, 'una codificación es cifrado', un límite/valor por defecto equivocado, una opción en el nivel o plan equivocado, una función/característica deprecada, un comando o acción que fallaría o borra datos.",
  impreciseExamples: "Ej: mostrar una forma que funciona sin aclarar que existe una más robusta o determinista; 'también existe X'; omitir un caso borde de endurecimiento.",
  serviceGroups: [],
  auditorSys: "Sos auditor técnico de la certificación. Verificás si el CONTENIDO de una lámina trata el TEMA OFICIAL de su unidad. Devolvés SOLO JSON.",
  auditorMismatchEg: "ej: la unidad es de un tema pero el contenido trata de otro distinto",
  securityLintRules: [GENERIC_SECRET_RULE],
  cliLintRules: [],
};

const DOMAIN_BY_CERT: Record<string, CertDomain> = { "ai-200": AI200_DOMAIN };

/** Perfil de dominio del cert ACTIVO (flip-safe vía CONFIG.certId). AI-200 = Azure exacto; resto = agnóstico. */
export function certDomain(): CertDomain {
  return DOMAIN_BY_CERT[CONFIG.certId] ?? DEFAULT_DOMAIN;
}
