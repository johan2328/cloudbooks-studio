#!/bin/bash
set -euo pipefail

echo "[bootstrap] Limpieza completa de dependencias locales"
rm -rf node_modules
rm -rf artifacts/*/node_modules
rm -rf lib/*/node_modules
rm -rf lib/integrations/*/node_modules
rm -f package-lock.json pnpm-lock.yaml pnpm-workspace.yaml

if command -v npm >/dev/null 2>&1; then
  echo "[bootstrap] Limpieza cache npm"
  npm cache clean --force >/dev/null 2>&1 || true
fi

echo "[bootstrap] Instalando dependencias"
npm install --no-package-lock

echo "[bootstrap] Empujando esquema DB"
npm --workspace @workspace/db run push

echo "[bootstrap] Sincronizando runtime con GitHub"
npm run sync:replit

echo "[bootstrap] Listo"
