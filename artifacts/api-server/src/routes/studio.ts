/*
 * REFACTORED — este archivo ya no es el punto de entrada para las rutas de Studio.
 *
 * Las responsabilidades fueron separadas en:
 *   routes/studio-generate.ts  — POST /studio/generate-visual-atlas-page
 *   routes/studio-approval.ts  — POST /studio/approve-page/:pageId
 *   routes/studio-status.ts    — GET  /studio/output-status/:pageId
 *                                GET  /studio/seed-status/:pageId
 *                                GET  /studio/key-status
 *   routes/studio-qa.ts        — GET  /studio/qa-report/:pageId
 *
 * Y la lógica de dominio fue extraída a:
 *   services/export/paths.ts
 *   services/export/output-status.ts
 *   services/renderers/visual-atlas/render-golden-page.ts
 *   services/generation/visual-atlas/build-image-prompt.ts
 *   services/generation/visual-atlas/generate-upper-visual.ts
 *   services/generation/visual-atlas/generate-visual-atlas-page.ts
 *   services/qa/visual-atlas/validate-page-html.ts
 *   services/qa/approval-gate.ts
 *
 * Este archivo puede eliminarse. routes/index.ts ya no lo importa.
 */
