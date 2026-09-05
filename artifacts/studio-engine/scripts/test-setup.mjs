/**
 * SETUP DE TESTS — aísla el estado antes de que cargue cualquier módulo del engine.
 *
 * Se carga con `node --import ./scripts/test-setup.mjs` ANTES del código bajo test, que es
 * la única forma de ganarle a `config.ts`: lee `process.env` al evaluarse el módulo y los
 * `import` estáticos de ESM están hoisted, así que setear la variable dentro de un test
 * llegaría tarde.
 *
 * Qué arregla: `engine.test.ts` persiste una página de prueba ("99") y la borra en un
 * `finally`. Funciona, pero escribe en el working root de PRODUCCIÓN — si el proceso muere
 * entre el alta y la baja, esa página queda en el store real. Apuntando el root a un
 * temporal, ningún test puede tocar los libros.
 *
 * El directorio es determinista (no `mkdtemp`) para no acumular temporales: cada corrida
 * reutiliza el mismo y arranca limpio.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const raiz = path.join(os.tmpdir(), "cloudbooks-engine-test");

fs.rmSync(raiz, { recursive: true, force: true });
fs.mkdirSync(raiz, { recursive: true });

process.env.ENGINE_OUTPUT_ROOT = raiz;
process.env.ENGINE_PUBLISH_ROOT = raiz;

// Sin llave no se hace ninguna llamada real a OpenAI aunque un test toque esa ruta.
delete process.env.OPENAI_API_KEY;
delete process.env.ENGINE_AZURE_IMAGE_KEY;
delete process.env.ENGINE_KIMI_KEY;
