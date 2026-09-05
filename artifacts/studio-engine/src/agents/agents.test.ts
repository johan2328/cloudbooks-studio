import { test } from "node:test";
import assert from "node:assert/strict";

import { AGENT_REGISTRY } from "./registry.js";
import { AGENT_CONTRACTS, PANEL_OUTPUT_CONTRACT } from "./contracts.js";
import { PANEL } from "../book/route-panel.js";

/**
 * INVARIANTES DE LA CUADRILLA.
 *
 * Por qué existen: `agents/contracts.ts` se presenta a sí mismo como DOCUMENTACIÓN
 * ("centralizado acá como documentación para el modal Ver contrato"), pero tiene DOS
 * lectores con consecuencias muy distintas:
 *
 *   1. `agents/agents-rollup.ts:77` → alimenta `GET /engine/agents`. Documentación real.
 *   2. `book/route-panel.ts:155`   → `AGENT_CONTRACTS[exp.id]?.[0]?.prompt` se usa como
 *      SYSTEM PROMPT VIVO de los expertos del panel. Si falta la entrada, el experto no
 *      falla ruidosamente: devuelve `error: "sin contrato para <id>"` y el panel sigue
 *      con un experto menos, bajando la calidad del veredicto sin que nadie lo note.
 *
 * O sea: editar este archivo "porque es sólo documentación" puede cambiar comportamiento
 * de producción. Estos tests convierten esa trampa en un fallo de CI.
 */

const registryIds = AGENT_REGISTRY.map((a) => a.id);

test("registry y contratos cubren exactamente los mismos agentes", () => {
  const enRegistro = new Set(registryIds);
  const conContrato = new Set(Object.keys(AGENT_CONTRACTS));

  const sinContrato = [...enRegistro].filter((id) => !conContrato.has(id));
  const sinRegistro = [...conContrato].filter((id) => !enRegistro.has(id));

  assert.deepEqual(sinContrato, [], `agentes en registry.ts sin entrada en contracts.ts: ${sinContrato.join(", ")}`);
  assert.deepEqual(sinRegistro, [], `contratos huérfanos (sin agente en registry.ts): ${sinRegistro.join(", ")}`);
});

test("no hay ids duplicados en el registry", () => {
  assert.equal(new Set(registryIds).size, registryIds.length, "hay ids repetidos en AGENT_REGISTRY");
});

test("todo contrato tiene al menos un prompt no vacío", () => {
  for (const [id, contratos] of Object.entries(AGENT_CONTRACTS)) {
    assert.ok(contratos.length > 0, `${id}: array de contratos vacío`);
    for (const c of contratos) {
      assert.ok(c.label.trim().length > 0, `${id}: contrato sin label`);
      assert.ok(c.prompt.trim().length > 20, `${id}/${c.label}: prompt vacío o trivial`);
    }
  }
});

/* ── Lo que de verdad importa: los prompts VIVOS del panel ── */

const expertosLLM = PANEL.filter((p) => p.modality !== "lint");

test("cada experto del panel que llama al LLM tiene su prompt vivo", () => {
  assert.ok(expertosLLM.length > 0, "el panel no tiene expertos LLM: revisá PANEL en route-panel.ts");
  for (const exp of expertosLLM) {
    const prompt = AGENT_CONTRACTS[exp.id]?.[0]?.prompt;
    assert.ok(
      prompt && prompt.trim().length > 0,
      `PANEL incluye "${exp.id}" pero AGENT_CONTRACTS no le da prompt → runExpert devolvería ` +
      `"sin contrato para ${exp.id}" y el panel correría con un experto menos, en silencio.`,
    );
  }
});

test("los prompts del panel imponen el contrato de salida JSON", () => {
  // El runner parsea la respuesta como JSON con forma fija (score/would_ship/findings/veredicto).
  // Si un prompt deja de interpolar PANEL_OUTPUT_CONTRACT, el experto devuelve prosa y su
  // veredicto se pierde al normalizar.
  for (const exp of expertosLLM) {
    const prompt = AGENT_CONTRACTS[exp.id]![0]!.prompt;
    assert.ok(
      prompt.includes(PANEL_OUTPUT_CONTRACT),
      `el prompt de "${exp.id}" no incluye PANEL_OUTPUT_CONTRACT: su salida no sería JSON parseable`,
    );
  }
});

test("todo experto del panel existe como agente del registry", () => {
  for (const exp of PANEL) {
    assert.ok(registryIds.includes(exp.id), `PANEL incluye "${exp.id}", que no está en AGENT_REGISTRY`);
  }
});
