import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import type { PageStatus, OutputPack, AssetType, AssetSlotStatus } from "@/lib/types";
import {
  CheckCircle2, AlertTriangle, Clock, RotateCcw, Loader2,
  ChevronRight, Target, BookOpen, Layers, History, Award,
  Download, RefreshCw, MessageSquare, ThumbsUp, Shield,
  Activity, FileText, Package, ExternalLink, Zap, CheckCheck,
  FlaskConical, Database, Upload, Link2, Eye, Globe, Image,
  MoreHorizontal, Sparkles,
} from "lucide-react";

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
type Tab = "contenido"|"grounding"|"preview"|"qa"|"versiones"|"export"|"assets";

interface QADims {
  artDir: number; editCons: number; legib: number; techAcc: number;
  densidad: number; riesgoComercial: number;
}
interface Autocheck {
  pregunta: string; opciones: string[];
  respuesta: string; explicacion: string;
}
interface VersionEntry { version: string; date: string; note: string; author: string }
interface PageEdit {
  num: string; title: string; domain: string; examObjective: string;
  contexto: string; conceptos: string[]; trampas: string[];
  autocheck: Autocheck; groundingStatus: "verified"|"partial"|"pending"; groundingNote: string;
  sources: string[]; editorialStatus: PageStatus; qaTotal: number; qaDims: QADims;
  contractVersion: string; lastRevision: string; redTeam: string[];
  versionHistory: VersionEntry[];
}

/* ─── Datos editoriales Batch 01–10 ─────────────────────────────────────── */
const EDITORIAL: Record<string, PageEdit> = {
  "01": {
    num:"01", title:"Azure Container Registry: arquitectura y tiers",
    domain:"Azure Container Registry",
    examObjective:"Identificar el tier correcto de ACR para escenarios empresariales con geo-replicación, aislamiento de red y alta disponibilidad.",
    contexto:"ACR centraliza imágenes Docker y artefactos OCI para despliegues en Azure, habilitando integración con AKS, Container Apps, App Service y pipelines CI/CD. Los tiers Basic, Standard y Premium definen cuotas de almacenamiento, rendimiento y funcionalidades avanzadas como geo-replicación y private endpoint.",
    conceptos:["registry","repository","image","tag","digest SHA256","tier Basic","tier Standard","tier Premium","geo-replicación","private endpoint"],
    trampas:[
      "latest es mutable — no garantiza reproducibilidad; usar digest SHA256 para fijar versión exacta",
      "Geo-replicación solo está disponible en el tier Premium — ni Basic ni Standard lo soportan",
      "Private endpoint requiere tier Premium — no está disponible en Basic ni Standard",
      "Basic no es suficiente para escenarios empresariales que requieren aislamiento de red o replicación entre regiones",
    ],
    autocheck:{
      pregunta:"Una app necesita desplegar imágenes desde ACR en varias regiones con acceso privado. ¿Qué tier revisar primero?",
      opciones:["A. Basic — es el más económico","B. Standard — tiene buen balance precio/rendimiento","C. Premium — soporta geo-replicación y private endpoint","D. Cualquier tier con VNet injection"],
      respuesta:"C",
      explicacion:"Premium es el único tier de ACR que incluye geo-replicación a múltiples regiones y soporte para private endpoint. Basic y Standard no cubren estos requisitos.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra Azure Container Registry Overview (MS Learn) y ACR Pricing documentation.",
    sources:["MS Learn – Azure Container Registry overview","MS Learn – ACR service tiers","Azure Architecture Center – Container scenarios"],
    editorialStatus:"approved", qaTotal:9.42,
    qaDims:{artDir:9.6, editCons:9.4, legib:9.2, techAcc:9.5, densidad:9.3, riesgoComercial:9.6},
    contractVersion:"v24", lastRevision:"2026-05-18",
    redTeam:["Verificar coherencia entre badges de tier y diagrama de capacidades — v3 resuelto","Confirmar que los límites de almacenamiento aparecen en tabla y no sólo en texto"],
    versionHistory:[
      {version:"v3",date:"2026-05-18",note:"Aprobada tras ajuste de tabla de tiers y corrección de badge Premium",author:"Editorial Agent"},
      {version:"v2",date:"2026-05-12",note:"Corrección de diagrama de arquitectura — mejora de jerarquía visual",author:"Visual Agent"},
      {version:"v1",date:"2026-05-05",note:"Versión inicial generada desde grounding verificado",author:"Generation Agent"},
    ],
  },
  "02": {
    num:"02", title:"Build y push de imágenes hacia ACR",
    domain:"Azure Container Registry",
    examObjective:"Distinguir los métodos de build y push a ACR: docker local, az acr build cloud y ACR Tasks — y sus implicaciones de autenticación.",
    contexto:"El flujo de publicación puede venir de docker local, az acr build o pipelines. El resultado debe quedar en ACR con tags trazables y autenticación correcta. az acr build ejecuta la compilación en la nube de Azure sin requerir Docker local.",
    conceptos:["docker build","docker push","az acr build","ACR Tasks","multi-stage build","AcrPush role","az acr login","service principal","managed identity"],
    trampas:[
      "Confundir build local (docker build) con build cloud (az acr build) — el segundo no requiere Docker local",
      "Asumir que push implica versión inmutable — el tag puede sobreescribirse; el digest SHA256 es el identificador inmutable",
      "Olvidar el paso de login (az acr login o docker login) antes del push — genera error 401",
      "No asignar el rol AcrPush a la identidad que ejecuta el pipeline — error de permisos",
    ],
    autocheck:{
      pregunta:"Un desarrollador ejecuta 'docker push myregistry.azurecr.io/myapp:latest' y recibe error 401. ¿Cuál es la causa más probable?",
      opciones:["A. El tag 'latest' no está permitido en ACR","B. No se ejecutó 'az acr login' o 'docker login' previamente","C. La imagen supera el límite de almacenamiento del tier","D. El tier Basic no soporta push desde CLI"],
      respuesta:"B",
      explicacion:"Error 401 en push hacia ACR indica falta de autenticación. Se debe ejecutar 'az acr login --name myregistry' o 'docker login' con credenciales antes del push.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – Build and push Docker image to ACR y Azure CLI Reference.",
    sources:["MS Learn – Build and push to ACR Quick Start","MS Learn – ACR Tasks documentation","Docker Official Docs – docker push"],
    editorialStatus:"approved", qaTotal:9.36,
    qaDims:{artDir:9.4, editCons:9.3, legib:9.5, techAcc:9.2, densidad:9.1, riesgoComercial:9.5},
    contractVersion:"v24", lastRevision:"2026-05-19",
    redTeam:["Controlar varianza iconográfica entre comandos CLI y portal UI — pendiente v3","Asegurar numeración homogénea de pasos en el flujo de build"],
    versionHistory:[
      {version:"v2",date:"2026-05-19",note:"Aprobada con observación: revisar iconos CLI en próxima iteración",author:"QA Specialist"},
      {version:"v1",date:"2026-05-08",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "03": {
    num:"03", title:"Tags, digest SHA256 y trazabilidad",
    domain:"Azure Container Registry",
    examObjective:"Diferenciar tags mutables e inmutables y comprender cuándo usar digest SHA256 para garantizar reproducibilidad en CI/CD.",
    contexto:"Los tags ayudan a nombrar versiones (latest, v1.2, prod) pero son mutables — pueden sobreescribirse. El digest SHA256 es el identificador criptográfico inmutable de una imagen exacta, necesario para reproducibilidad estricta en pipelines y auditorías de seguridad.",
    conceptos:["tag mutable","tag inmutable","digest SHA256","quarantine policy","OCI artifact","content trust","image manifest","image lock"],
    trampas:[
      "latest no garantiza reproducibilidad — es un tag mutable que puede apuntar a cualquier imagen",
      "Usar solo tags semánticos (v1.2) ayuda pero no garantiza inmutabilidad sin configurar tag lock o digest fijo",
      "Digest SHA256 identifica exactamente una versión — no puede modificarse sin generar un digest diferente",
      "Quarantine policy bloquea imágenes sin escaneo aprobado — puede causar fallos en pull si no se configura correctamente",
    ],
    autocheck:{
      pregunta:"¿Qué referencia garantiza que siempre se desplegará exactamente la misma imagen, sin importar actualizaciones posteriores?",
      opciones:["A. Tag 'latest'","B. Tag semántico como v2.1.0","C. Digest SHA256 de la imagen","D. Nombre del repositorio con versión"],
      respuesta:"C",
      explicacion:"Solo el digest SHA256 identifica de forma única e inmutable una versión de imagen. Los tags (incluyendo semánticos) son referencias mutables que pueden reasignarse.",
    },
    groundingStatus:"partial", groundingNote:"Parcialmente verificado — pendiente confirmar quarantine policy en tier Basic. Fuentes principales verificadas.",
    sources:["MS Learn – Content trust in ACR","OCI Distribution Specification","Azure Policy for ACR – image signing"],
    editorialStatus:"qa_review", qaTotal:9.28,
    qaDims:{artDir:9.3, editCons:9.2, legib:9.4, techAcc:9.1, densidad:9.0, riesgoComercial:9.4},
    contractVersion:"v24", lastRevision:"2026-05-20",
    redTeam:["Verificar recortes en diagrama de trazabilidad SHA256 — zona inferior derecha","Revisar densidad del contexto — puede simplificarse sin perder precisión técnica","Evitar espacios vacíos en zona de autocheck"],
    versionHistory:[
      {version:"v2",date:"2026-05-20",note:"En revisión QA — diagrama pendiente de corrección de recortes",author:"QA Specialist"},
      {version:"v1",date:"2026-05-10",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "04": {
    num:"04", title:"Private Endpoint, firewall y resolución DNS",
    domain:"Azure Container Registry",
    examObjective:"Configurar acceso privado a ACR desde VNet usando Private Endpoint, Private DNS Zone y reglas de firewall.",
    contexto:"Private Endpoint asigna una IP privada de la VNet al registro ACR, eliminando la exposición pública. La resolución DNS debe apuntar al FQDN privado vía Azure Private DNS Zone. Las reglas de firewall permiten o bloquean IP públicas o subredes VNet adicionales.",
    conceptos:["Private Endpoint","Private DNS Zone","firewall rules","VNet service endpoint","network isolation","DNS override","private IP","NIC del registro"],
    trampas:[
      "Sin configurar Private DNS Zone, el FQDN del registro resuelve a IP pública aunque haya Private Endpoint",
      "Firewall IP rules y VNet rules son independientes — ambas deben configurarse según el escenario",
      "Private Endpoint requiere tier Premium — no funciona en Basic ni Standard",
      "Service endpoint no reemplaza a Private Endpoint — no proporciona IP privada al registro",
    ],
    autocheck:{
      pregunta:"ACR tiene Private Endpoint configurado pero los pods en AKS siguen conectándose a la IP pública. ¿Cuál es la causa?",
      opciones:["A. AKS no soporta Private Endpoint para ACR","B. Falta configurar Azure Private DNS Zone correctamente","C. El tier no soporta acceso privado","D. Se necesita reiniciar el registro ACR"],
      respuesta:"B",
      explicacion:"Sin la zona DNS privada configurada y vinculada a la VNet, el FQDN del registro resuelve a la IP pública aunque exista un Private Endpoint activo.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – ACR Private Link y Azure Private DNS documentation.",
    sources:["MS Learn – ACR Private Endpoints","MS Learn – Azure Private DNS Zones","Azure Architecture Center – Network security"],
    editorialStatus:"needs_revision", qaTotal:9.12,
    qaDims:{artDir:9.0, editCons:9.2, legib:9.3, techAcc:9.0, densidad:8.9, riesgoComercial:9.2},
    contractVersion:"v24", lastRevision:"2026-05-21",
    redTeam:["Mejorar jerarquía de títulos en la sección DNS — actualmente poco diferenciada","Verificar que el diagrama de red no recorta la capa de subred privada","Diagrama de firewall rules necesita contraste mayor entre allow/deny"],
    versionHistory:[
      {version:"v2",date:"2026-05-21",note:"Requiere ajuste visual — diagrama de red pendiente de corrección",author:"Visual Agent"},
      {version:"v1",date:"2026-05-11",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "05": {
    num:"05", title:"Retention policy, limpieza y costos",
    domain:"Azure Container Registry",
    examObjective:"Aplicar políticas de retención y comandos de purge para controlar el crecimiento del registro y optimizar costos.",
    contexto:"Sin política de retención, los manifiestos sin tag acumulan almacenamiento y aumentan costos. La retention policy elimina automáticamente manifiestos no etiquetados tras N días. El comando 'acr purge' permite limpieza granular por repositorio, filtro de tags y antigüedad.",
    conceptos:["retention policy","untagged manifests","acr purge","purge schedule","storage cost","manifest","repository cleanup","ACR Tasks purge"],
    trampas:[
      "Retention policy solo elimina manifiestos sin tag — las imágenes con tags activos no se ven afectadas",
      "Purge sin --filter puede eliminar más imágenes de las esperadas — siempre usar --dry-run primero",
      "El costo de almacenamiento depende del tier — Basic tiene el límite más bajo (10 GB incluidos)",
      "Retention policy no elimina repositorios enteros — solo manifiestos no etiquetados dentro de repositorios",
    ],
    autocheck:{
      pregunta:"¿Qué comando permite simular la eliminación de imágenes antiguas sin hacerlo de verdad?",
      opciones:["A. az acr purge --simulate","B. az acr purge --dry-run","C. az acr repository delete --preview","D. az acr policy retention --test"],
      respuesta:"B",
      explicacion:"'--dry-run' en 'az acr purge' muestra qué imágenes serían eliminadas sin ejecutar la eliminación. Es la práctica recomendada antes de limpiezas en producción.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – ACR Retention Policy y Azure Pricing Calculator (precios 2026).",
    sources:["MS Learn – ACR Retention Policy","Azure Cost Management Docs","MS Learn – ACR CLI purge reference"],
    editorialStatus:"approved", qaTotal:9.33,
    qaDims:{artDir:9.5, editCons:9.3, legib:9.2, techAcc:9.3, densidad:9.4, riesgoComercial:9.5},
    contractVersion:"v24", lastRevision:"2026-05-18",
    redTeam:["Confirmar que el ejemplo de costo mensual usa precios actualizados 2026 — verificado en v2"],
    versionHistory:[
      {version:"v2",date:"2026-05-18",note:"Aprobada tras actualización de tabla de precios 2026",author:"Editorial Agent"},
      {version:"v1",date:"2026-05-07",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "06": {
    num:"06", title:"Geo-replicación y zone redundancy",
    domain:"Azure Container Registry",
    examObjective:"Configurar geo-replicación en ACR Premium para reducir latencia de pull y garantizar disponibilidad multi-región.",
    contexto:"La geo-replicación crea réplicas de lectura/escritura del registro en múltiples regiones Azure, minimizando latencia de pull desde AKS o Container Apps en cada región. Zone redundancy (ZRS) protege contra fallos de zona de disponibilidad dentro de una región.",
    conceptos:["geo-replicación","zone redundancy (ZRS)","réplica de registro","consistencia eventual","failover automático","Premium tier","latencia de pull","región de réplica"],
    trampas:[
      "Geo-replicación es exclusiva del tier Premium — ni Basic ni Standard lo soportan",
      "Las réplicas tienen consistencia eventual — puede haber un pequeño desfase de sincronización",
      "Zone redundancy no es lo mismo que geo-replicación — ZRS protege dentro de una región, geo-rep entre regiones",
      "Replicar a una región no implica que el pull sea automáticamente local — el cliente debe resolver al endpoint correcto",
    ],
    autocheck:{
      pregunta:"Una empresa con AKS en East US y West Europe quiere minimizar latencia de pull de imágenes. ¿Qué configuración de ACR usar?",
      opciones:["A. ACR Standard con CDN","B. ACR Premium con geo-replicación en ambas regiones","C. Dos registros ACR independientes","D. ACR Basic con replicación manual"],
      respuesta:"B",
      explicacion:"ACR Premium con geo-replicación crea réplicas en East US y West Europe. Cada clúster AKS hace pull desde la réplica más cercana, minimizando latencia y costos de transferencia.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – ACR Geo-Replication y Azure Availability Zones documentation.",
    sources:["MS Learn – ACR Geo-Replication","MS Learn – Zone Redundancy","Azure Architecture Center – Multi-region apps"],
    editorialStatus:"approved", qaTotal:9.25,
    qaDims:{artDir:9.2, editCons:9.3, legib:9.1, techAcc:9.4, densidad:9.2, riesgoComercial:9.5},
    contractVersion:"v24", lastRevision:"2026-05-19",
    redTeam:["Validar que el mapa de regiones no muestre zonas deprecated","Evitar respuesta autocheck duplicada entre preguntas 2 y 3 — revisar en v3"],
    versionHistory:[
      {version:"v2",date:"2026-05-19",note:"Aprobada con observación menor en autocheck",author:"QA Specialist"},
      {version:"v1",date:"2026-05-09",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "07": {
    num:"07", title:"Managed identity y pull seguro desde AKS",
    domain:"Azure Container Registry",
    examObjective:"Configurar Managed Identity para pull seguro de imágenes desde AKS a ACR sin usar credenciales explícitas.",
    contexto:"Managed Identity permite a AKS autenticarse contra ACR sin secretos ni contraseñas. Se asigna el rol AcrPull a la kubelet identity (identidad del node pool). Workload Identity permite granularidad a nivel de pod.",
    conceptos:["Managed Identity","system-assigned identity","user-assigned identity","kubelet identity","AcrPull role","RBAC de Azure","imagePullSecret","Workload Identity"],
    trampas:[
      "Confundir system-assigned con user-assigned identity — cada una tiene ciclo de vida y asignación diferente",
      "AcrPull debe asignarse a la kubelet identity (identidad del node pool), no solo al cluster identity",
      "imagePullSecret es un método alternativo pero requiere rotación manual de credenciales — Managed Identity es preferido",
      "Score técnico bajo en v2 — sección de roles RBAC en revisión",
    ],
    autocheck:{
      pregunta:"¿Qué rol de Azure RBAC debe asignarse a la kubelet identity de AKS para que los pods puedan hacer pull desde ACR?",
      opciones:["A. AcrPush","B. Contributor en el registro ACR","C. AcrPull","D. ACR Administrator"],
      respuesta:"C",
      explicacion:"AcrPull es el rol mínimo requerido para pull de imágenes. Contributor daría permisos excesivos. AcrPush solo es necesario para operaciones de escritura.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – Authenticate with ACR from AKS y Azure RBAC documentation.",
    sources:["MS Learn – AKS + ACR Integration","MS Learn – Managed Identity","Azure RBAC Roles Reference"],
    editorialStatus:"qa_review", qaTotal:9.18,
    qaDims:{artDir:9.2, editCons:9.1, legib:9.3, techAcc:9.0, densidad:8.9, riesgoComercial:9.3},
    contractVersion:"v24", lastRevision:"2026-05-21",
    redTeam:["Validar que el grounding no se muestre como texto de infografía — issue de layout","Mejorar diferenciación visual entre system-assigned y user-assigned identity","Score técnico bajo — revisar sección de roles RBAC antes de aprobación"],
    versionHistory:[
      {version:"v2",date:"2026-05-21",note:"En revisión QA — sección RBAC y layout pendientes",author:"QA Specialist"},
      {version:"v1",date:"2026-05-12",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "08": {
    num:"08", title:"Container Apps con imágenes privadas",
    domain:"Azure Container Registry",
    examObjective:"Configurar Azure Container Apps para usar imágenes privadas de ACR con Managed Identity y secretos de entorno.",
    contexto:"Container Apps se integra con ACR privado vía Managed Identity asignada al managed environment. Los secretos de Container Apps permiten pasar credenciales de forma segura. Blue/green deployment se logra con revisiones (revisions).",
    conceptos:["managed environment","Container Apps revision","Managed Identity para pull","container secrets","blue/green deployment","revision traffic split","AcrPull en Container Apps"],
    trampas:[
      "La Managed Identity debe asignarse al managed environment, no al Container App individual",
      "Densidad de contexto excesiva en zona de trampas — refactorizar para reducir solapamientos",
      "Score general por debajo de 9.0 en 3 dimensiones — requiere regeneración selectiva",
      "Secretos en Container Apps no se reflejan automáticamente en revisiones activas — requiere nueva revisión",
    ],
    autocheck:{
      pregunta:"¿Dónde se asigna la Managed Identity para que Container Apps pueda hacer pull de imágenes privadas de ACR?",
      opciones:["A. Al Container App individual","B. Al managed environment del Container App","C. Al App Service Plan subyacente","D. Al Azure Container Registry directamente"],
      respuesta:"B",
      explicacion:"La Managed Identity se asigna al managed environment, que es el recurso de infraestructura compartida. Así todos los Container Apps en ese environment heredan los permisos de pull.",
    },
    groundingStatus:"partial", groundingNote:"Parcialmente verificado — documentación de managed environments actualizada en GA. Verificar configuración de identidad con referencia 2026.",
    sources:["MS Learn – Container Apps with ACR","Azure Container Apps Docs","MS Learn – Managed Environments"],
    editorialStatus:"needs_revision", qaTotal:8.96,
    qaDims:{artDir:9.0, editCons:8.9, legib:9.0, techAcc:8.9, densidad:8.7, riesgoComercial:9.0},
    contractVersion:"v24", lastRevision:"2026-05-20",
    redTeam:["Regeneración selectiva recomendada para sección de configuración de managed environment","Densidad de contexto excesiva en zona de trampas — refactorizar","Score general por debajo de 9.0 en 3 dimensiones — no apta para aprobación"],
    versionHistory:[
      {version:"v2",date:"2026-05-20",note:"Pendiente regeneración — scores bajos en densidad y consistencia",author:"QA Specialist"},
      {version:"v1",date:"2026-05-14",note:"Versión inicial generada",author:"Generation Agent"},
    ],
  },
  "09": {
    num:"09", title:"CI/CD hacia ACR con pipelines",
    domain:"Azure Container Registry",
    examObjective:"Implementar pipelines CI/CD con Azure DevOps y GitHub Actions para automatizar build y push de imágenes a ACR.",
    contexto:"Pipelines CI/CD con Azure DevOps y GitHub Actions automatizan el flujo build-test-push a ACR. Se usan service connections o credenciales federadas para autenticación. ACR Tasks puede reemplazar pasos de build en la nube.",
    conceptos:["Azure Pipelines","GitHub Actions","service connection","OIDC federated credentials","az acr build en pipeline","trigger por rama","escaneo de vulnerabilidades","caché de capas Docker"],
    trampas:[
      "Grounding pendiente de verificación — no apto para aprobación en estado actual",
      "Estructura de pipeline YAML requiere revisión técnica — algunos pasos pueden estar desactualizados",
      "Legibilidad baja — sección de triggers demasiado densa para el espacio disponible",
      "Confundir service connection (Azure DevOps) con service principal directo — tienen configuración diferente",
    ],
    autocheck:{
      pregunta:"¿Qué mecanismo de autenticación elimina la necesidad de almacenar secretos en el pipeline para push a ACR?",
      opciones:["A. Service principal con cliente/secreto rotados manualmente","B. Credenciales de administrador del registro","C. OIDC federated credentials con Managed Identity","D. PAT token de Azure DevOps"],
      respuesta:"C",
      explicacion:"OIDC federated credentials permiten que GitHub Actions o Azure Pipelines se autentiquen contra Azure AD sin secretos almacenados. La identidad del pipeline se verifica mediante token federado.",
    },
    groundingStatus:"pending", groundingNote:"PENDIENTE — verificar contra MS Learn Azure Pipelines + ACR y GitHub Actions for Azure (documentación 2026).",
    sources:["MS Learn – Azure Pipelines with ACR","GitHub Actions for Azure Docs","ACR Tasks from pipeline reference"],
    editorialStatus:"grounding_pending", qaTotal:8.70,
    qaDims:{artDir:8.8, editCons:8.7, legib:8.6, techAcc:8.7, densidad:8.5, riesgoComercial:9.0},
    contractVersion:"v24", lastRevision:"2026-05-22",
    redTeam:["Grounding pendiente de verificación — bloquea aprobación","Estructura YAML del pipeline requiere revisión técnica","Legibilidad baja en sección de triggers — sección demasiado densa"],
    versionHistory:[
      {version:"v1",date:"2026-05-22",note:"Grounding pendiente — versión inicial no apta para aprobación",author:"Generation Agent"},
    ],
  },
  "10": {
    num:"10", title:"Troubleshooting de acceso, permisos y versiones",
    domain:"Azure Container Registry",
    examObjective:"Diagnosticar y resolver errores comunes de acceso, autenticación y resolución de imágenes en ACR.",
    contexto:"Los errores más frecuentes en ACR son 401/403 de autenticación, fallos de resolución DNS en private endpoint y errores de permisos RBAC. Azure Monitor Logs y ACR diagnostics permiten auditoría de accesos.",
    conceptos:["error 401 Unauthorized","error 403 Forbidden","DNS resolution failure","RBAC misconfiguration","az acr check-health","Azure Monitor Logs","ACR diagnostics","token expiry"],
    trampas:[
      "Error 401 indica falta de autenticación — ejecutar az acr login o renovar token",
      "Error 403 indica token válido pero sin permisos suficientes — verificar asignación de rol AcrPull/AcrPush",
      "DNS failure en private endpoint frecuentemente causado por falta de Private DNS Zone o vinculación incorrecta",
      "az acr check-health verifica conectividad y configuración del cliente — herramienta diagnóstica clave",
    ],
    autocheck:{
      pregunta:"Un pod en AKS recibe error 403 al hacer pull desde ACR. El token es válido. ¿Qué verificar primero?",
      opciones:["A. Reiniciar el pod y el node","B. Verificar que la kubelet identity tiene el rol AcrPull asignado en el registro ACR","C. Cambiar el tier de ACR a Premium","D. Deshabilitar el firewall del registro temporalmente"],
      respuesta:"B",
      explicacion:"Error 403 con token válido indica permisos insuficientes. La kubelet identity del node pool debe tener el rol AcrPull asignado explícitamente en el scope del registro ACR.",
    },
    groundingStatus:"verified", groundingNote:"Verificado contra MS Learn – ACR Troubleshooting y Azure Monitor Logs for ACR.",
    sources:["MS Learn – Troubleshooting ACR","Azure Monitor Docs","ACR Error Reference – az acr check-health"],
    editorialStatus:"qa_pending", qaTotal:8.84,
    qaDims:{artDir:8.9, editCons:8.8, legib:8.9, techAcc:8.7, densidad:8.8, riesgoComercial:9.1},
    contractVersion:"v24", lastRevision:"2026-05-22",
    redTeam:["Pendiente revisión QA completa — primera iteración","Verificar que la tabla de errores cubre todos los códigos HTTP relevantes","Confirmar cobertura de escenarios de autenticación fallida"],
    versionHistory:[
      {version:"v1",date:"2026-05-22",note:"Primera versión generada — pendiente revisión QA inicial",author:"Generation Agent"},
    ],
  },
};

/* ─── Config estados ─────────────────────────────────────────────────────── */
const STATUS_CFG: Record<PageStatus, {
  label: string; color: string; bg: string; dot: string;
  icon: React.ComponentType<{className?:string}>
}> = {
  draft:             { label:"Borrador",             color:"text-white/30",    bg:"bg-white/5 border-white/10",              dot:"bg-white/15",    icon:Clock         },
  grounding_pending: { label:"Grounding pendiente",  color:"text-orange-400",  bg:"bg-orange-500/10 border-orange-500/20",   dot:"bg-orange-400",  icon:AlertTriangle },
  grounded:          { label:"Grounded",             color:"text-cyan-400",    bg:"bg-cyan-500/10 border-cyan-500/20",       dot:"bg-cyan-400",    icon:CheckCircle2  },
  generating:        { label:"Generando…",           color:"text-violet-400",  bg:"bg-violet-500/10 border-violet-500/20",   dot:"bg-violet-400",  icon:RotateCcw     },
  qa_pending:        { label:"QA pendiente",         color:"text-sky-400",     bg:"bg-sky-500/10 border-sky-500/20",         dot:"bg-sky-400",     icon:Clock         },
  qa_review:         { label:"En revisión QA",       color:"text-blue-400",    bg:"bg-blue-500/10 border-blue-500/20",       dot:"bg-blue-400",    icon:Shield        },
  needs_revision:    { label:"Requiere ajuste",      color:"text-amber-400",   bg:"bg-amber-500/10 border-amber-500/20",     dot:"bg-amber-400",   icon:AlertTriangle },
  approved:          { label:"Aprobada",             color:"text-emerald-400", bg:"bg-emerald-500/10 border-emerald-500/20", dot:"bg-emerald-500", icon:CheckCircle2  },
  exported:          { label:"Exportada",            color:"text-teal-400",    bg:"bg-teal-500/10 border-teal-500/20",       dot:"bg-teal-400",    icon:Download      },
};

const STANDARD = 9.5;
const DOMAIN_COLOR = "#0369a1";

/* ─── Componente principal ───────────────────────────────────────────────── */
export default function Biblioteca() {
  const [selectedNum, setSelectedNum] = useState("01");
  const { state, executeGrounding, startGeneration, executeQA, approvePage, requestRevision, regenerateSelective, exportPage, getPage, getOutputPackForPage } = useStudio();

  const selected   = EDITORIAL[selectedNum];
  // Status comes from the store; fallback to EDITORIAL's editorialStatus mapped to PageStatus
  const storeStatus = getPage(selectedNum)?.status;
  const effectiveStatus: PageStatus = storeStatus ?? "draft";

  const all = Object.values(EDITORIAL);
  const avgQA = all.reduce((s,p) => s+p.qaTotal,0) / all.length;

  // Live counts from store (batch 01–10 pages)
  const batch10Pages = state.pages.filter(p => parseInt(p.id, 10) >= 1 && parseInt(p.id, 10) <= 10);
  const approvedCount = batch10Pages.filter(p => p.status === "approved" || p.status === "exported").length;
  const reviewCount   = batch10Pages.filter(p => p.status === "qa_review" || p.status === "needs_revision").length;
  const blockedCount  = batch10Pages.filter(p => p.status === "grounding_pending" || p.status === "draft" || p.status === "grounded").length;

  // Output real counts for all 10 pages
  const realOutputCount = Object.keys(EDITORIAL).filter(num => {
    const pack = getOutputPackForPage(num);
    if (!pack) return false;
    return Object.values(pack.slots).some(s => s.status === "real_available" || s.status === "approved" || s.status === "exported");
  }).length;

  return (
    <Layout title="Visual Atlas — Batch 01–10">
      <div className="flex h-full overflow-hidden bg-[#0a1220]">

        {/* ── Panel izquierdo ──────────────────────────────────────────── */}
        <aside className="w-60 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
          {/* Batch summary */}
          <div className="p-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Visual Atlas · Batch 01–10</span>
            </div>

            {/* Output real summary — protagonista */}
            <div className={cn(
              "mb-2 px-2.5 py-2 rounded-sm border",
              realOutputCount === 0
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-emerald-500/5 border-emerald-500/20"
            )}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Image className={cn("w-2.5 h-2.5 shrink-0", realOutputCount === 0 ? "text-amber-400/60" : "text-emerald-400")} />
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Outputs reales</span>
                <span className={cn("ml-auto text-sm font-black tabular-nums", realOutputCount === 0 ? "text-amber-400" : "text-emerald-400")}>
                  {realOutputCount}/10
                </span>
              </div>
              {realOutputCount === 0 && (
                <p className="text-[7px] text-amber-400/50 leading-tight">
                  Sin output real. Próxima acción: Generar pág. 01.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 mb-2">
              {[
                { label:"Aprobadas", value: approvedCount, color:"text-emerald-400" },
                { label:"Revisión",  value: reviewCount,   color:"text-amber-400" },
                { label:"Pendientes",value: blockedCount,  color:"text-white/30" },
              ].map(c => (
                <div key={c.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-1.5 py-1 text-center">
                  <p className={cn("text-sm font-black tabular-nums",c.color)}>{c.value}</p>
                  <p className="text-[7px] text-white/25">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-[8px] text-white/30">Score promedio</span>
                <span className="text-[9px] font-bold text-blue-400">{avgQA.toFixed(2)}</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{width:`${(avgQA/10)*100}%`}} />
              </div>
              <div className="flex justify-between">
                <span className="text-[7px] text-white/20">Estándar 9.5</span>
                <span className="text-[7px] font-semibold text-amber-400">−{(STANDARD-avgQA).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Page list */}
          <div className="flex-1 overflow-y-auto">
            {Object.values(EDITORIAL).map(ed => {
              const st: PageStatus = getPage(ed.num)?.status ?? "draft";
              const cfg = STATUS_CFG[st];
              const Icon = cfg.icon;
              return (
                <button key={ed.num} onClick={() => setSelectedNum(ed.num)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-white/[0.04] flex items-start gap-2 transition-all",
                    selectedNum === ed.num
                      ? "bg-blue-500/10 border-l-2 border-l-blue-400 pl-[10px]"
                      : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
                  )}>
                  <MiniThumb num={ed.num} status={st} score={ed.qaTotal} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] font-bold text-white/30">#{ed.num}</span>
                      <Icon className={cn("w-2 h-2 shrink-0", cfg.color)} />
                    </div>
                    <p className="text-[9px] font-medium text-white/70 leading-snug line-clamp-2">{ed.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("text-[7px] font-bold", cfg.color)}>{cfg.label}</span>
                      <span className={cn("text-[9px] font-bold tabular-nums", ed.qaTotal>=9.3?"text-emerald-400":ed.qaTotal>=9.0?"text-amber-400":"text-orange-400")}>
                        {ed.qaTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Panel derecho ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <PageDetail
              ed={selected}
              effectiveStatus={effectiveStatus}
              onApprove={() => approvePage(selectedNum)}
              onRevision={() => requestRevision(selectedNum, "Corrección solicitada por red team")}
              onRegen={() => regenerateSelective(selectedNum)}
              onExport={() => exportPage(selectedNum, "PDF")}
              onGrounding={() => executeGrounding(selectedNum)}
              onGenerate={() => startGeneration(selectedNum)}
              onQA={() => executeQA(selectedNum)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-white/25">Selecciona una página</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ─── Mini thumbnail ─────────────────────────────────────────────────────── */
function MiniThumb({num, status, score}: {num:string; status:PageStatus; score:number}) {
  const cfg = STATUS_CFG[status];
  return (
    <div className="w-9 h-9 rounded-sm shrink-0 overflow-hidden relative flex flex-col border border-white/[0.08]"
      style={{background:`linear-gradient(135deg, ${DOMAIN_COLOR}20 0%, ${DOMAIN_COLOR}08 100%)`}}>
      <div className="h-2 flex items-center px-0.5 gap-0.5" style={{backgroundColor:`${DOMAIN_COLOR}25`}}>
        <span className="text-[5px] font-black leading-none text-white/70">{num}</span>
        <div className="flex-1 h-px rounded" style={{backgroundColor:`${DOMAIN_COLOR}40`}}/>
      </div>
      <div className="flex-1 px-0.5 pb-0.5 flex flex-col gap-0.5 justify-center">
        {[60,85,45].map((w,i)=><div key={i} className="h-px rounded bg-white/20" style={{width:`${w}%`}}/>)}
        <div className="flex gap-0.5 mt-0.5">
          <div className="flex-1 h-1 rounded-sm bg-red-500/20"/>
          <div className="flex-1 h-1 rounded-sm bg-teal-500/20"/>
        </div>
      </div>
      <div className={cn("absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full", cfg.dot)} />
    </div>
  );
}

/* ─── Page detail ────────────────────────────────────────────────────────── */
function PageDetail({ed, effectiveStatus, onApprove, onRevision, onRegen, onExport, onGrounding, onGenerate, onQA}: {
  ed: PageEdit; effectiveStatus: PageStatus;
  onApprove:()=>void; onRevision:()=>void; onRegen:()=>void; onExport:()=>void;
  onGrounding:()=>void; onGenerate:()=>void; onQA:()=>void;
}) {
  const [tab, setTab] = useState<Tab>("contenido");
  const [groundingRunning, setGroundingRunning] = useState(false);
  const [groundingDone, setGroundingDone] = useState(false);
  const [qaRunning, setQaRunning] = useState(false);
  const [qaDone, setQaDone] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { getOutputPackForPage, uploadAssetDemo, linkAsset, approveAsset, replaceAssetRequest } = useStudio();

  useEffect(() => {
    function h(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    }
    if (showMore) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMore]);
  const outputPack = getOutputPackForPage(ed.num);

  const cfg = STATUS_CFG[effectiveStatus];
  const Icon = cfg.icon;
  const canApprove = (["qa_review", "needs_revision"] as PageStatus[]).includes(effectiveStatus);
  const canExport  = (["approved", "exported"] as PageStatus[]).includes(effectiveStatus);

  function runGrounding() {
    setGroundingRunning(true);
    onGrounding();
    setTimeout(() => { setGroundingRunning(false); setGroundingDone(true); }, 2000);
  }
  function runQA() {
    setQaRunning(true);
    onQA();
    setTimeout(() => { setQaRunning(false); setQaDone(true); }, 2200);
  }

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{className?:string}> }[] = [
    { id:"contenido",  label:"Contenido",  icon: BookOpen   },
    { id:"grounding",  label:"Grounding",  icon: Activity   },
    { id:"preview",    label:"Preview",    icon: FileText   },
    { id:"qa",         label:"QA",         icon: Shield     },
    { id:"versiones",  label:"Versiones",  icon: History    },
    { id:"export",     label:"Export",     icon: Download   },
    { id:"assets",     label:"Assets",     icon: Database   },
  ];

  return (
    <div className="p-5 space-y-4">
      {/* ── Header ── */}
      <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-600 to-violet-600" />
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Preview miniatura */}
            <div className="w-40 h-28 rounded-sm overflow-hidden border border-white/10 shrink-0 relative">
              <AtlasPagePreview ed={ed} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[8px] font-bold bg-[#0078d4] text-white px-1.5 py-0.5 rounded-sm tracking-wider uppercase">ACR · #{ed.num}</span>
                <span className={cn("flex items-center gap-1 text-[8px] font-semibold border rounded-sm px-1.5 py-0.5", cfg.bg, cfg.color)}>
                  <Icon className="w-2.5 h-2.5" />{cfg.label}
                </span>
                <span className="text-[8px] text-white/25 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-sm">
                  Contrato {ed.contractVersion}
                </span>
                <span className="text-[8px] text-white/25 ml-auto">{ed.lastRevision}</span>
              </div>
              <h2 className="text-sm font-bold text-white leading-tight mb-0.5">{ed.title}</h2>
              <p className="text-[9px] text-white/30 mb-2">{ed.domain}</p>
              <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{ed.examObjective}</p>

              {/* QA dims mini */}
              <div className="flex items-end gap-3 mt-3">
                <div className="text-center">
                  <p className={cn("text-xl font-black tabular-nums leading-none", ed.qaTotal>=9.3?"text-emerald-400":ed.qaTotal>=9.0?"text-amber-400":"text-orange-400")}>
                    {ed.qaTotal.toFixed(2)}
                  </p>
                  <p className="text-[7px] text-white/25 mt-0.5">Score QA</p>
                </div>
                <div className="flex-1 space-y-0.5">
                  {[
                    {l:"Arte",val:ed.qaDims.artDir},{l:"Editorial",val:ed.qaDims.editCons},
                    {l:"Legib.",val:ed.qaDims.legib},{l:"Técnica",val:ed.qaDims.techAcc},
                  ].map(d=>(
                    <div key={d.l} className="flex items-center gap-1.5">
                      <span className="text-[7px] text-white/25 w-12 shrink-0">{d.l}</span>
                      <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full",d.val>=9.3?"bg-emerald-500":d.val>=9.0?"bg-amber-400":"bg-orange-400")}
                          style={{width:`${(d.val/10)*100}%`}} />
                      </div>
                      <span className="text-[7px] font-bold tabular-nums text-white/40 w-5 text-right">{d.val.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-[7px] text-white/20 mb-0.5">Obj.</p>
                  <p className="text-sm font-bold text-white/20">{STANDARD}</p>
                  <p className={cn("text-[8px] font-semibold", ed.qaTotal>=STANDARD?"text-emerald-400":"text-amber-400")}>
                    {ed.qaTotal>=STANDARD ? "✓" : `−${(STANDARD-ed.qaTotal).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions — 1 primario + 1 secundario + kebab */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">

            {/* Primario — determinado por estado */}
            {(effectiveStatus === "draft" || effectiveStatus === "grounding_pending") && (
              <ActBtn icon={FlaskConical} label="Ejecutar grounding" variant="primary" onClick={runGrounding} loading={groundingRunning} done={groundingDone} />
            )}
            {effectiveStatus === "grounded" && (
              <ActBtn icon={Sparkles} label={`Generar pág. ${ed.num}`} variant="primary" onClick={() => { onGenerate(); setTab("preview"); }} />
            )}
            {(effectiveStatus === "qa_review" || effectiveStatus === "needs_revision") && (
              <ActBtn icon={ThumbsUp} label="Aprobar" variant="primary" onClick={onApprove} />
            )}
            {(effectiveStatus === "approved" || effectiveStatus === "exported") && (
              <ActBtn icon={Download} label="Exportar" variant="primary" onClick={onExport} />
            )}

            {/* Secundario fijo: Ver contenido */}
            <ActBtn icon={BookOpen} label="Ver contenido" variant="ghost" onClick={() => setTab("contenido")} />

            {/* Kebab: más acciones raras */}
            <div className="relative ml-auto" ref={moreRef}>
              <button onClick={() => setShowMore(v => !v)}
                className="h-7 px-2 border border-white/10 rounded-sm text-white/25 hover:text-white/50 hover:border-white/20 transition-all">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {showMore && (
                <div className="absolute right-0 top-8 w-52 bg-[#0d1629] border border-white/10 rounded-sm shadow-xl z-50 py-1">
                  <div className="px-3 py-1.5 text-[7px] font-bold text-white/20 uppercase tracking-widest border-b border-white/[0.06]">
                    Más acciones
                  </div>
                  <button onClick={() => { runQA(); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-2 transition-colors">
                    <Shield className="w-3 h-3" />Ejecutar QA
                  </button>
                  <button onClick={() => { onRegen(); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-2 transition-colors">
                    <RefreshCw className="w-3 h-3" />Regenerar selectivo
                  </button>
                  <button onClick={() => { runGrounding(); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-2 transition-colors">
                    <FlaskConical className="w-3 h-3" />Re-ejecutar grounding
                  </button>
                  <div className="border-t border-white/[0.06] my-1" />
                  <button onClick={() => { setTab("assets"); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-2 transition-colors">
                    <Database className="w-3 h-3" />Ver assets y outputs
                  </button>
                  <button onClick={() => { onRevision(); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-2 transition-colors">
                    <MessageSquare className="w-3 h-3" />Solicitar corrección
                  </button>
                  <button className="w-full text-left px-3 py-2 text-[10px] text-white/25 flex items-center gap-2 cursor-not-allowed">
                    <ExternalLink className="w-3 h-3" />Abrir en GitHub
                  </button>
                  <button className="w-full text-left px-3 py-2 text-[10px] text-white/25 flex items-center gap-2 cursor-not-allowed">
                    <Target className="w-3 h-3" />Validar rutas de assets
                  </button>
                  <button className="w-full text-left px-3 py-2 text-[10px] text-white/25 flex items-center gap-2 cursor-not-allowed">
                    Ver logs técnicos
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
        <div className="flex border-b border-white/[0.06] overflow-x-auto">
          {TABS.map(t => {
            const TIcon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 whitespace-nowrap",
                  tab===t.id
                    ? "border-b-2 border-blue-400 text-blue-300 bg-blue-500/5"
                    : "text-white/25 hover:text-white/50 hover:bg-white/[0.02]"
                )}>
                <TIcon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {/* ── Contenido ── */}
          {tab==="contenido" && (
            <div className="space-y-4 max-w-3xl">
              <DField label="Objetivo de examen" value={ed.examObjective} accent="blue" />
              <DField label="Contexto técnico" value={ed.contexto} />

              <div>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2">Conceptos clave</p>
                <div className="flex flex-wrap gap-1.5">
                  {ed.conceptos.map(c=>(
                    <span key={c} className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-300/70 px-2 py-0.5 rounded-sm font-medium">{c}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2">Trampas de examen</p>
                <div className="space-y-1.5">
                  {ed.trampas.map((t,i)=>(
                    <div key={i} className="flex items-start gap-2 bg-red-500/5 border border-red-500/15 rounded-sm px-3 py-2">
                      <span className="text-[8px] font-black text-red-400 shrink-0 mt-px">{i+1}.</span>
                      <p className="text-[10px] text-white/65 leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-teal-500/20 rounded-sm overflow-hidden">
                <div className="bg-teal-500/5 border-b border-teal-500/10 px-4 py-2 flex items-center gap-2">
                  <CheckCheck className="w-3 h-3 text-teal-400" />
                  <span className="text-[9px] font-bold text-teal-400/80 uppercase tracking-widest">Autocheck</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-white/80">{ed.autocheck.pregunta}</p>
                  <div className="space-y-1.5">
                    {ed.autocheck.opciones.map((o,i)=>{
                      const letter = o[0];
                      const isCorrect = letter === ed.autocheck.respuesta;
                      return (
                        <div key={i} className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-sm border text-[10px]",
                          isCorrect
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300/80"
                            : "bg-white/[0.02] border-white/[0.06] text-white/45"
                        )}>
                          <span className={cn("font-black shrink-0", isCorrect?"text-emerald-400":"text-white/25")}>{letter}.</span>
                          <span>{o.slice(3)}</span>
                          {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto mt-px" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-wider mb-1">Explicación</p>
                    <p className="text-[10px] text-white/60 leading-relaxed">{ed.autocheck.explicacion}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Grounding ── */}
          {tab==="grounding" && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-sm px-4 py-3">
                <div className={cn("w-3 h-3 rounded-full shrink-0",
                  groundingDone||ed.groundingStatus==="verified" ? "bg-emerald-400" :
                  ed.groundingStatus==="partial" ? "bg-amber-400" : "bg-violet-400"
                )} />
                <div>
                  <p className="text-xs font-bold text-white/80">
                    {groundingDone||ed.groundingStatus==="verified" ? "Verificado con Microsoft Learn" :
                     ed.groundingStatus==="partial" ? "Verificación parcial" : "Pendiente de verificación"}
                  </p>
                  <p className="text-[9px] text-white/35 mt-0.5">{ed.groundingNote}</p>
                </div>
                <button onClick={runGrounding} disabled={groundingRunning}
                  className="ml-auto flex items-center gap-1.5 h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/50 font-medium transition-all">
                  {groundingRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                  {groundingRunning ? "Verificando…" : groundingDone ? "Re-ejecutar" : "Ejecutar grounding"}
                </button>
              </div>

              <div>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2">Fuentes Microsoft Learn</p>
                <div className="space-y-1.5">
                  {ed.sources.map((s,i)=>(
                    <div key={i} className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/15 rounded-sm px-3 py-2">
                      <ExternalLink className="w-3 h-3 text-blue-400/50 shrink-0" />
                      <span className="text-[10px] text-blue-300/70 font-medium">{s}</span>
                      {(groundingDone||ed.groundingStatus==="verified") && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-3">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-1.5">Regla del contrato visual</p>
                <p className="text-[9px] text-white/40 leading-relaxed">
                  El estado de grounding debe ser "Verificado" para habilitar el preflight de generación y aprobar la página. Un grounding parcial permite edición pero bloquea la generación automatizada.
                </p>
              </div>
            </div>
          )}

          {/* ── Preview ── */}
          {tab==="preview" && (
            <div className="space-y-4">
              {/* Banner: preview real pendiente */}
              <div className="bg-amber-500/8 border border-amber-500/25 rounded-sm px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-300">Preview real pendiente</p>
                  <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">
                    Lo que ves abajo es una simulación estructural — no es output generado por OpenAI.
                    Ejecuta generación real para obtener el asset visual de producción.
                  </p>
                </div>
                <button onClick={() => onGenerate()}
                  className="shrink-0 flex items-center gap-1.5 h-7 px-3 bg-teal-600 hover:bg-teal-500 text-white text-[9px] font-bold rounded-sm transition-all">
                  <Sparkles className="w-3 h-3" />Generar real
                </button>
              </div>

              {/* Preview con watermark DEMO */}
              <div className="max-w-xl mx-auto relative">
                <div className="opacity-40 pointer-events-none">
                  <AtlasPagePreview ed={ed} size="lg" />
                </div>
                {/* Watermark overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div style={{ transform: "rotate(-20deg)" }}
                    className="border-2 border-white/40 px-5 py-2 rounded-sm">
                    <span className="text-white/40 text-xl font-black tracking-[0.2em] uppercase">DEMO PREVIEW</span>
                  </div>
                </div>
                {/* Badge esquina */}
                <div className="absolute top-2 right-2">
                  <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider">SIMULADO</span>
                </div>
              </div>

              {/* Estados de los 3 outputs principales */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "HTML", state: "Pendiente" },
                  { label: "PNG", state: "Pendiente" },
                  { label: "PDF", state: "Pendiente" },
                ].map(o => (
                  <div key={o.label} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.07] rounded-sm px-2.5 py-1.5">
                    <span className="text-[9px] font-bold text-white/40">{o.label}</span>
                    <span className="text-[8px] text-white/20">{o.state}</span>
                  </div>
                ))}
                <span className="text-[8px] text-white/20 self-center ml-1">
                  · Contrato {ed.contractVersion}
                </span>
              </div>
            </div>
          )}

          {/* ── QA ── */}
          {tab==="qa" && (
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Diagnóstico QA · 6 dimensiones</p>
                <button onClick={runQA} disabled={qaRunning}
                  className="flex items-center gap-1.5 h-6 px-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-sm text-[8px] text-white/40 transition-all">
                  {qaRunning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Shield className="w-2.5 h-2.5" />}
                  {qaRunning ? "Ejecutando…" : qaDone ? "Re-ejecutar QA" : "Ejecutar QA"}
                </button>
              </div>

              {[
                {key:"artDir",      label:"Dirección de arte",       desc:"Layout, jerarquía visual, colores, iconografía y composición global.", val:ed.qaDims.artDir},
                {key:"editCons",    label:"Consistencia editorial",  desc:"Coherencia con contrato v24: header/footer, tipografía, trampas y autocheck.", val:ed.qaDims.editCons},
                {key:"legib",       label:"Legibilidad",             desc:"Tamaño de texto, contraste, densidad informacional y ausencia de solapamientos.", val:ed.qaDims.legib},
                {key:"techAcc",     label:"Precisión técnica",       desc:"Corrección de contenido Azure, validez del grounding y cobertura de objetivos.", val:ed.qaDims.techAcc},
                {key:"densidad",    label:"Densidad útil",           desc:"Relación información relevante / espacio utilizado — sin huecos vacíos ni saturación.", val:ed.qaDims.densidad},
                {key:"riesgoComercial", label:"Riesgo comercial",   desc:"Ausencia de copy comercial, lenguaje de venta o referencias a precio/producto no técnico.", val:ed.qaDims.riesgoComercial},
              ].map(d=>(
                <div key={d.key} className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-white/75">{d.label}</p>
                      <p className="text-[9px] text-white/30 mt-0.5 leading-relaxed">{d.desc}</p>
                    </div>
                    <div className="text-center ml-4 shrink-0">
                      <p className={cn("text-lg font-black tabular-nums leading-none",d.val>=9.3?"text-emerald-400":d.val>=9.0?"text-amber-400":"text-orange-400")}>
                        {d.val.toFixed(1)}
                      </p>
                      <p className="text-[7px] text-white/20">/ 10</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",d.val>=9.3?"bg-emerald-500":d.val>=9.0?"bg-amber-400":"bg-orange-400")}
                      style={{width:`${(d.val/10)*100}%`}} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[7px] text-white/15">0</span>
                    <span className="text-[7px] text-amber-400/60 font-medium">Estándar 9.5</span>
                    <span className="text-[7px] text-white/15">10</span>
                  </div>
                </div>
              ))}

              {/* Red team */}
              <div className="mt-2 border-t border-white/[0.05] pt-3">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Observaciones red team</p>
                {ed.redTeam.map((obs,i)=>(
                  <div key={i} className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-sm px-3 py-2 mb-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400/60 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-white/55 leading-relaxed">{obs}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Versiones ── */}
          {tab==="versiones" && (
            <div className="space-y-2 max-w-xl">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Historial de versiones</p>
              {ed.versionHistory.map((v,i)=>(
                <div key={i} className={cn(
                  "flex items-start gap-3 px-3 py-3 rounded-sm border transition-all",
                  i===0 ? "bg-blue-500/8 border-blue-500/25" : "bg-white/[0.02] border-white/[0.05]"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center text-[8px] font-black shrink-0",
                    i===0 ? "bg-blue-600 text-white" : "bg-white/[0.08] text-white/40"
                  )}>
                    {v.version}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-white/70">{v.version}</span>
                      <span className="text-[8px] text-white/25">{v.date}</span>
                      {i===0 && <span className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wide">ACTUAL</span>}
                    </div>
                    <p className="text-[10px] text-white/55 leading-relaxed">{v.note}</p>
                    <p className="text-[8px] text-white/25 mt-1">{v.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Export ── */}
          {tab==="export" && (
            <div className="space-y-4 max-w-xl">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Exportación de activos</p>

              {[
                {fmt:"HTML", icon:FileText, desc:"Página interactiva con CSS embebido. Ideal para plataforma web y LMS.",  available: canExport, color:"#2563eb"},
                {fmt:"PNG",  icon:Package, desc:"Imagen de alta resolución (2480×3508 px). Apta para impresión e inserción en presentaciones.", available: canExport, color:"#0d9488"},
                {fmt:"PDF",  icon:Award,   desc:"PDF vectorial con metadata editorial. Formato de entrega final al cliente.", available: canExport, color:"#7c3aed"},
              ].map(f=>{
                const FIcon = f.icon;
                return (
                  <div key={f.fmt} className={cn(
                    "flex items-center gap-3 p-3 rounded-sm border transition-all",
                    f.available
                      ? "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]"
                      : "bg-white/[0.01] border-white/[0.04] opacity-50"
                  )}>
                    <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0"
                      style={{background:`${f.color}15`}}>
                      <FIcon className="w-4 h-4" style={{color:f.color}} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white/75">{f.fmt}</p>
                      <p className="text-[9px] text-white/35 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                    <button
                      disabled={!f.available}
                      onClick={onExport}
                      className={cn(
                        "flex items-center gap-1.5 h-7 px-3 rounded-sm text-[9px] font-semibold transition-all shrink-0",
                        f.available
                          ? "bg-white/[0.08] hover:bg-white/[0.15] text-white/60 border border-white/10"
                          : "bg-transparent text-white/15 cursor-not-allowed border border-white/[0.04]"
                      )}>
                      <Download className="w-3 h-3" />
                      {f.available ? `Exportar ${f.fmt}` : "No disponible"}
                    </button>
                  </div>
                );
              })}

              {!canExport && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-sm px-4 py-3">
                  <p className="text-[9px] text-amber-400/80 leading-relaxed">
                    La exportación requiere que la página esté en estado <strong>Aprobada</strong>. Estado actual: <strong>{STATUS_CFG[effectiveStatus].label}</strong>.
                  </p>
                </div>
              )}

              <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 mt-2">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-1.5">Collection Pack</p>
                <p className="text-[9px] text-white/35 leading-relaxed">
                  Exportación del batch completo 01–10 como Collection Pack (ZIP con HTML + PNG + PDF por página). Disponible cuando todas las páginas del batch estén aprobadas.
                </p>
                <button className="mt-2 w-full flex items-center justify-center gap-1.5 h-7 border border-white/[0.08] rounded-sm text-[9px] text-white/20 cursor-not-allowed">
                  <Package className="w-3 h-3" />
                  Exportar Collection Pack · 0/10 páginas listas
                </button>
              </div>
            </div>
          )}

          {/* ── Assets ── */}
          {tab==="assets" && (
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Output Pack · pág. {ed.num}</p>
                {outputPack && (
                  <span className="text-[7px] text-white/20">Contrato <span className="font-semibold text-white/35">{outputPack.contractVersion}</span></span>
                )}
              </div>

              {!outputPack ? (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-4 text-center">
                  <p className="text-[9px] text-white/25">No hay OutputPack disponible para esta página</p>
                </div>
              ) : (
                <>
                  {/* Slots */}
                  {(["preview","html","png","pdf","qa_report","contract"] as AssetType[]).map(type => {
                    const slot = outputPack.slots[type];
                    const ACFG: Record<AssetType, {label:string; ext:string; Icon:React.ComponentType<{className?:string}>; color:string; bg:string}> = {
                      preview:   { label:"Preview",   ext:"SVG",  Icon:Eye,      color:"text-violet-400", bg:"bg-violet-500/10 border-violet-500/20" },
                      html:      { label:"HTML",      ext:"HTML", Icon:Globe,    color:"text-blue-400",   bg:"bg-blue-500/10 border-blue-500/20" },
                      png:       { label:"PNG 2x",    ext:"PNG",  Icon:Image,    color:"text-teal-400",   bg:"bg-teal-500/10 border-teal-500/20" },
                      pdf:       { label:"PDF",       ext:"PDF",  Icon:FileText, color:"text-amber-400",  bg:"bg-amber-500/10 border-amber-500/20" },
                      qa_report: { label:"QA Report", ext:"JSON", Icon:Shield,   color:"text-sky-400",    bg:"bg-sky-500/10 border-sky-500/20" },
                      contract:  { label:"Contrato",  ext:"PDF",  Icon:Package,  color:"text-emerald-400",bg:"bg-emerald-500/10 border-emerald-500/20" },
                    };
                    const ac = ACFG[type];
                    const AIcon = ac.Icon;
                    const STATUS_SLOT: Record<AssetSlotStatus, {label:string; badge:string; dot:string}> = {
                      pending:          { label:"Pendiente",        badge:"bg-white/[0.04] text-white/20 border-white/[0.06]",          dot:"bg-white/15" },
                      demo_available:   { label:"Demo disponible",  badge:"bg-violet-500/10 text-violet-300 border-violet-500/20",      dot:"bg-violet-400 opacity-60" },
                      real_available:   { label:"Real cargado",     badge:"bg-blue-500/10 text-blue-300 border-blue-500/20",            dot:"bg-blue-400" },
                      approved:         { label:"Aprobado",         badge:"bg-emerald-500/10 text-emerald-300 border-emerald-500/20",   dot:"bg-emerald-400" },
                      needs_replacement:{ label:"Requiere reemplazo",badge:"bg-amber-500/10 text-amber-300 border-amber-500/20",       dot:"bg-amber-400" },
                      exported:         { label:"Exportado",        badge:"bg-teal-500/10 text-teal-300 border-teal-500/20",           dot:"bg-teal-400" },
                    };
                    const sc = STATUS_SLOT[slot.status];
                    return (
                      <div key={type} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 border rounded-sm transition-all",
                        slot.status === "pending" ? "bg-white/[0.02] border-white/[0.05]" :
                        slot.status === "demo_available" ? "bg-violet-500/5 border-violet-500/15" :
                        slot.status === "approved" ? "bg-emerald-500/5 border-emerald-500/15" :
                        "bg-[#0a1220] border-white/[0.07]"
                      )}>
                        <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center border shrink-0", ac.bg)}>
                          <AIcon className={cn("w-3.5 h-3.5", ac.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-[9px] font-bold", ac.color)}>{ac.label}</span>
                            <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", sc.badge)}>
                              <span className={cn("w-1 h-1 rounded-full shrink-0", sc.dot)} />
                              {slot.isDemo && slot.status === "demo_available" ? "Demo" : sc.label}
                            </span>
                            {slot.isDemo && (
                              <span className="text-[7px] bg-violet-500/10 text-violet-400/50 border border-violet-500/15 px-1 py-px rounded-sm">DEMO</span>
                            )}
                          </div>
                          <p className="text-[8px] text-white/20 truncate">{slot.filename ?? <em>sin archivo</em>}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {slot.status === "pending" && (
                            <>
                              <button onClick={() => uploadAssetDemo(ed.num, type)}
                                className="flex items-center gap-1 h-6 px-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
                                <Upload className="w-2.5 h-2.5" />Cargar
                              </button>
                              <button onClick={() => linkAsset(ed.num, type, `/outputs/ai200-p${ed.num}/output.${type}`, `ai200-p${ed.num}.${type}`)}
                                className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-sm text-[8px] text-white/35 font-semibold transition-all">
                                <Link2 className="w-2.5 h-2.5" />Vincular
                              </button>
                            </>
                          )}
                          {slot.status === "demo_available" && (
                            <button onClick={() => uploadAssetDemo(ed.num, type)}
                              className="flex items-center gap-1 h-6 px-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-sm text-[8px] text-violet-400 font-semibold transition-all">
                              <Upload className="w-2.5 h-2.5" />Reemplazar real
                            </button>
                          )}
                          {slot.status === "real_available" && (
                            <button onClick={() => approveAsset(ed.num, type)}
                              className="flex items-center gap-1 h-6 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-sm text-[8px] text-emerald-400 font-semibold transition-all">
                              <CheckCircle2 className="w-2.5 h-2.5" />Aprobar
                            </button>
                          )}
                          {(slot.status === "approved" || slot.status === "exported") && (
                            <button onClick={() => replaceAssetRequest(ed.num, type)}
                              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-sm text-[8px] text-white/25 font-semibold transition-all">
                              <RefreshCw className="w-2.5 h-2.5" />Reemplazar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Nota de migración */}
                  <div className="mt-2 flex items-start gap-2 px-3 py-2.5 bg-amber-500/5 border border-amber-500/15 rounded-sm">
                    <AlertTriangle className="w-3 h-3 text-amber-400/50 mt-0.5 shrink-0" />
                    <p className="text-[8px] text-amber-300/50 leading-relaxed">
                      Los assets reales (HTML, PNG, PDF) existen en el filesystem local fuera de Replit. Usa el botón <strong>Cargar</strong> para cada slot o <strong>Vincular</strong> para registrar la ruta sin subir. Los previews demo son referenciales — no reemplazan los assets de producción.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── AtlasPagePreview ───────────────────────────────────────────────────── */
function AtlasPagePreview({ed, size}: {ed: PageEdit; size: "sm"|"lg"}) {
  const isLg = size==="lg";
  const cfg = STATUS_CFG[ed.editorialStatus as PageStatus] ?? STATUS_CFG["draft"];
  return (
    <div className={cn(
      "relative flex flex-col overflow-hidden",
      isLg ? "w-full rounded-sm border border-white/[0.08]" : "w-full h-full"
    )} style={{
      background:`linear-gradient(150deg, ${DOMAIN_COLOR}18 0%, #0a1220 80%)`,
      aspectRatio: isLg ? "8.5/11" : undefined,
      height: isLg ? undefined : "100%",
    }}>
      {/* Header bar */}
      <div className={cn("shrink-0 flex items-center gap-1.5 px-2", isLg?"py-2":"py-1")}
        style={{backgroundColor:`${DOMAIN_COLOR}25`, borderBottom:`1px solid ${DOMAIN_COLOR}30`}}>
        <div className={cn("rounded-sm flex items-center justify-center font-black text-white shrink-0",isLg?"w-5 h-5 text-[8px]":"w-3.5 h-3.5 text-[5px]")}
          style={{backgroundColor:DOMAIN_COLOR}}>{ed.num}</div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-white truncate leading-none", isLg?"text-[9px]":"text-[5px]")}
            style={{color:`${DOMAIN_COLOR}ff`}}>Azure Container Registry</p>
          {isLg && <p className="text-[7px] text-white/50 truncate leading-none mt-0.5">{ed.title}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={cn("w-px self-stretch", isLg?"h-4":"h-2")} style={{backgroundColor:`${DOMAIN_COLOR}50`}}/>
          <span className={cn("font-black tabular-nums", isLg?"text-[9px]":"text-[5px]",
            ed.qaTotal>=9.3?"text-emerald-400":"text-amber-400")}>{ed.qaTotal.toFixed(1)}</span>
        </div>
      </div>

      {/* Main content area */}
      <div className={cn("flex-1 flex gap-1.5 overflow-hidden", isLg?"p-2.5":"p-1")}>
        {/* Left: context + concepts */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {/* Context block */}
          <div className="rounded-sm p-1.5" style={{backgroundColor:`${DOMAIN_COLOR}12`,border:`1px solid ${DOMAIN_COLOR}25`}}>
            <p className={cn("font-bold uppercase tracking-wide mb-1", isLg?"text-[7px]":"text-[4px]")}
              style={{color:`${DOMAIN_COLOR}bb`}}>Contexto</p>
            {isLg ? (
              <p className="text-[7px] text-white/55 leading-relaxed line-clamp-3">{ed.contexto}</p>
            ) : (
              <div className="space-y-0.5">
                {[85,70,90,60].map((w,i)=><div key={i} className="h-0.5 rounded bg-white/20" style={{width:`${w}%`}}/>)}
              </div>
            )}
          </div>

          {/* Concepts */}
          <div>
            <p className={cn("font-bold uppercase tracking-wide mb-1", isLg?"text-[7px]":"text-[4px]")} style={{color:`${DOMAIN_COLOR}80`}}>
              Conceptos clave
            </p>
            <div className="flex flex-wrap gap-1">
              {ed.conceptos.slice(0, isLg?6:3).map(c=>(
                <span key={c} className={cn("rounded font-medium", isLg?"text-[6px] px-1.5 py-0.5":"text-[4px] px-0.5 py-px")}
                  style={{backgroundColor:`${DOMAIN_COLOR}20`,color:`${DOMAIN_COLOR}cc`,border:`1px solid ${DOMAIN_COLOR}30`}}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Diagram mock */}
          {isLg && (
            <div className="flex-1 rounded-sm border p-2" style={{borderColor:`${DOMAIN_COLOR}20`,backgroundColor:`${DOMAIN_COLOR}06`}}>
              <div className="flex flex-col items-center gap-1.5 h-full justify-center">
                {[["AKS","#0078d4"],["↓ AcrPull","#0d9488"],["ACR Registry","#7c3aed"],["↓ digest SHA256","#0d9488"],["Container App","#2563eb"]].map(([t,c],i)=>(
                  <div key={i} className={i%2===1?"text-[6px] text-white/25":undefined}>
                    {i%2===0 ? (
                      <div className="px-3 py-1 rounded-sm border text-[7px] font-bold text-white/70"
                        style={{backgroundColor:`${c}15`,borderColor:`${c}30`,color:`${c}cc`}}>{t}</div>
                    ) : <span>{t}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: traps + autocheck */}
        <div className={cn("flex flex-col gap-1.5", isLg?"w-36":"w-14")}>
          {/* Traps */}
          <div className="flex-1 rounded-sm overflow-hidden" style={{border:"1px solid rgba(239,68,68,0.25)"}}>
            <div className="px-1.5 py-1" style={{backgroundColor:"rgba(239,68,68,0.12)"}}>
              <p className={cn("font-bold uppercase tracking-wide text-red-400", isLg?"text-[6px]":"text-[4px]")}>⚠ Trampas</p>
            </div>
            <div className={cn("overflow-hidden", isLg?"p-1.5 space-y-1":"p-0.5 space-y-0.5")}>
              {ed.trampas.slice(0, isLg?3:2).map((t,i)=>(
                <div key={i} className="flex items-start gap-1">
                  <span className={cn("font-black text-red-400/70 shrink-0", isLg?"text-[6px]":"text-[4px]")}>{i+1}.</span>
                  {isLg
                    ? <p className="text-[6px] text-white/50 leading-relaxed">{t.substring(0,60)}…</p>
                    : <div className="flex-1 h-px bg-red-400/30 mt-0.5"/>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Autocheck */}
          <div className="rounded-sm overflow-hidden" style={{border:"1px solid rgba(20,184,166,0.25)"}}>
            <div className="px-1.5 py-1" style={{backgroundColor:"rgba(20,184,166,0.10)"}}>
              <p className={cn("font-bold uppercase tracking-wide text-teal-400", isLg?"text-[6px]":"text-[4px]")}>✓ Autocheck</p>
            </div>
            <div className={cn(isLg?"p-1.5":"p-0.5")}>
              {isLg ? (
                <>
                  <p className="text-[6px] text-white/55 leading-relaxed mb-1.5">{ed.autocheck.pregunta.substring(0,70)}…</p>
                  {ed.autocheck.opciones.slice(0,4).map((o,i)=>(
                    <div key={i} className={cn("flex items-center gap-1 px-1 py-px rounded mb-0.5",
                      o[0]===ed.autocheck.respuesta ? "bg-emerald-500/15" : "bg-transparent"
                    )}>
                      <span className={cn("text-[5px] font-black",o[0]===ed.autocheck.respuesta?"text-emerald-400":"text-white/20")}>{o[0]}.</span>
                      <span className={cn("text-[6px]",o[0]===ed.autocheck.respuesta?"text-emerald-300/80":"text-white/35")}>{o.slice(3,30)}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-0.5">
                  {[70,50].map((w,i)=><div key={i} className="h-px rounded bg-teal-400/25" style={{width:`${w}%`}}/>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={cn("shrink-0 flex items-center justify-between px-2", isLg?"py-1.5":"py-0.5")}
        style={{backgroundColor:`${DOMAIN_COLOR}15`,borderTop:`1px solid ${DOMAIN_COLOR}20`}}>
        <span className={cn("text-white/30", isLg?"text-[6px]":"text-[4px]")}>CloudBooks · AI-200 Visual Atlas</span>
        <span className={cn("font-mono text-white/20", isLg?"text-[6px]":"text-[4px]")}>{ed.contractVersion}</span>
        <div className={cn("rounded-full shrink-0", cfg.dot, isLg?"w-1.5 h-1.5":"w-1 h-1")} />
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function DField({label, value, accent}: {label:string; value:string; accent?:string}) {
  return (
    <div>
      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={cn(
        "text-[10px] leading-relaxed",
        accent==="blue" ? "text-blue-300/70 bg-blue-500/5 border border-blue-500/10 rounded-sm px-3 py-2" : "text-white/60"
      )}>{value}</p>
    </div>
  );
}

function ActBtn({icon:Icon, label, variant, disabled, onClick, loading, done}: {
  icon: React.ComponentType<{className?:string}>; label:string;
  variant:"primary"|"secondary"|"warning"|"ghost"; disabled?:boolean; onClick:()=>void; loading?:boolean; done?:boolean;
}) {
  const styles = {
    primary:   "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white",
    secondary: "bg-white/[0.04] border border-white/15 text-white/60 hover:bg-white/[0.08]",
    warning:   "bg-amber-500/10 border border-amber-500/25 text-amber-400/80 hover:bg-amber-500/15",
    ghost:     "bg-white/[0.03] border border-white/10 text-white/40 hover:bg-white/[0.07] hover:text-white/60",
  };
  return (
    <button onClick={onClick} disabled={disabled||loading}
      className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-sm text-[9px] font-semibold transition-all",
        styles[variant], (disabled||loading) && "opacity-40 cursor-not-allowed"
      )}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : done ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/> : <Icon className="w-3 h-3"/>}
      {label}
    </button>
  );
}

// Unused imports kept in scope to avoid TS errors
const _unused = { RotateCcw, ChevronRight, Award };
