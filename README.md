# CloudBooks Studio

CloudBooks Studio es la plataforma editorial interna para construir y operar una biblioteca de estudio por certificacion cloud.

Objetivo de negocio:
- producir colecciones premium de preparacion tecnica;
- acelerar comprension + retencion para examen;
- escalar el mismo metodo editorial a multiples clouds y certificaciones.

![Stack](https://img.shields.io/badge/stack-Node.js%2024%20%2B%20React%20%2B%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-privado-gray)

---

## Vision del producto

CloudBooks no es un generador aislado de infografias. Es una fabrica editorial con trazabilidad para construir colecciones completas.

Ruta de uso esperada:
1. Biblioteca -> elegir cloud.
2. Cloud -> elegir certificacion.
3. Certificacion -> operar sus formatos.

Formatos por certificacion:
- Master Book
- Visual Atlas
- Exam Traps Guide
- Question Bank
- Cheat Sheets
- Rapid Review Pack

---

## Estado real (mayo 2026)

Lo estable hoy:
- pipeline `Contenido -> Generacion -> QA -> Exportacion`;
- renderer deterministico para pagina 768x1152;
- guardrail de costo (`gpt-image-2` en `medium`);
- deteccion de output desactualizado por `layoutRevision`;
- sync operativo en Replit con `pnpm sync:replit`.

Lo prioritario en curso:
- Composer util para cerrar brecha al 9.5 con baseline real;
- control fino del balance visual (menos marco, menos aire muerto, mejor densidad util);
- crecimiento modular del sistema a mas certificaciones cloud.

---

## Alcance por cloud

Primera linea activa:
- Azure -> AI-200.

Modelo de expansion previsto:
- Azure (nuevas certificaciones),
- AWS,
- Google Cloud,
- y otras rutas de certificacion tecnica.

La arquitectura esta pensada para repetir contrato + pipeline por formato, no para un caso unico.

---

## Arquitectura resumida

```text
artifacts/
  api-server/
    data/page-seeds/
    domain/editorial-contracts/
    services/generation/
    services/renderers/
    services/qa/
    routes/
  studio/
    pages/
    components/
    lib/
lib/
  db/
  api-spec/
  api-client-react/
  api-zod/
```

Pieza clave:
- contrato visual centralizado para Visual Atlas:
  - [artifacts/api-server/src/domain/editorial-contracts/visual-atlas-v24.ts](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/artifacts/api-server/src/domain/editorial-contracts/visual-atlas-v24.ts)

---

## Requisitos

- Node.js 24+
- pnpm 9+
- PostgreSQL

Variables de entorno:

```env
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-...
SESSION_SECRET=...
```

---

## Desarrollo local

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/studio run dev
```

---

## Operacion en Replit

```bash
pnpm sync:replit
```

Este comando:
- sincroniza `origin/main`,
- instala dependencias,
- ejecuta `db push`,
- deja runtime alineado al SHA remoto.

---

## Estrategia editorial actual (Visual Atlas)

Base:
- topbar, hero, contexto, pregunta guia, traps/autocheck y footer en HTML deterministico;
- bloque visual superior generado por IA bajo contrato;
- QA estructural + editorial antes de aprobar.

Meta editorial:
- llevar score total a 9.5 para salida por lotes, con consistencia entre paginas.

---

## Proximo paso del Studio

1. Composer operativo para decisiones reales, no solo lectura.
2. Ajustes por bloque con regeneracion dirigida.
3. Grounding puntual por tema con TTL editorial (7 dias).
4. Escalado de la misma arquitectura a mas certificaciones y formatos.

---

## Documentacion interna

- [docs/editorial-composer-spec.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-spec.md)
- [docs/editorial-composer-transition-and-red-team.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-transition-and-red-team.md)
