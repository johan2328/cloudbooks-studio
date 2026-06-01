#!/bin/bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "[sync] git no esta disponible en este entorno" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[sync] npm no esta disponible en este entorno" >&2
  exit 1
fi

if git rev-parse --verify REBASE_HEAD >/dev/null 2>&1; then
  echo "[sync] Hay un rebase en progreso. Abortalo antes de sincronizar:" >&2
  echo "        git rebase --abort" >&2
  exit 1
fi

if git diff --name-only --diff-filter=U | grep -q .; then
  echo "[sync] Hay archivos en conflicto. Resuelvelos o limpia el workspace antes de sincronizar." >&2
  git diff --name-only --diff-filter=U
  exit 1
fi

stash_name="sync-replit-$(date +%s)"
created_stash="false"

current_sha="$(git rev-parse --short HEAD)"
branch_name="$(git rev-parse --abbrev-ref HEAD)"

echo "[sync] Branch actual: ${branch_name}"
echo "[sync] SHA actual:    ${current_sha}"

if [ -n "$(git status --short)" ]; then
  echo "[sync] Detectados cambios locales; creando stash automatico"
  git stash push --include-untracked -m "${stash_name}" >/dev/null
  created_stash="true"
fi

git fetch origin main

remote_sha="$(git rev-parse --short origin/main)"
echo "[sync] SHA remoto:    ${remote_sha}"

if [ "${current_sha}" != "${remote_sha}" ]; then
  echo "[sync] Aplicando git pull --rebase origin main"
  git pull --rebase origin main
else
  echo "[sync] Ya estabas alineado con origin/main"
fi

echo "[sync] Instalando dependencias con npm"
if [ -d node_modules/.pnpm ] || [ -f pnpm-lock.yaml ] || [ -f pnpm-workspace.yaml ]; then
  echo "[sync] Detectado estado mixto pnpm/npm; limpiando dependencias locales"
  rm -rf node_modules
  rm -rf artifacts/*/node_modules
  rm -rf lib/*/node_modules
  rm -rf lib/integrations/*/node_modules
  rm -f package-lock.json
fi

if [ -f package-lock.json ]; then
  npm ci
else
  npm install --no-package-lock
fi

echo "[sync] Empujando esquema DB"
npm --workspace @workspace/db run push

if [ "${created_stash}" = "true" ]; then
  echo "[sync] Restaurando cambios locales"
  git stash pop --index >/dev/null || {
    echo "[sync] No se pudieron restaurar automaticamente todos los cambios locales." >&2
    echo "[sync] Revisa 'git stash list' y resuelve el conflicto manualmente." >&2
    exit 1
  }
fi

echo "[sync] Runtime listo en $(git rev-parse --short HEAD)"
