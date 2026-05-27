#!/bin/bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "[sync] git no esta disponible en este entorno" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[sync] pnpm no esta disponible en este entorno" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[sync] El workspace tiene cambios locales. Haz commit o stash antes de sincronizar." >&2
  git status --short
  exit 1
fi

current_sha="$(git rev-parse --short HEAD)"
branch_name="$(git rev-parse --abbrev-ref HEAD)"

echo "[sync] Branch actual: ${branch_name}"
echo "[sync] SHA actual:    ${current_sha}"

git fetch origin main

remote_sha="$(git rev-parse --short origin/main)"
echo "[sync] SHA remoto:    ${remote_sha}"

if [ "${current_sha}" != "${remote_sha}" ]; then
  echo "[sync] Aplicando git pull --rebase origin main"
  git pull --rebase origin main
else
  echo "[sync] Ya estabas alineado con origin/main"
fi

echo "[sync] Instalando dependencias bloqueadas"
pnpm install --frozen-lockfile

echo "[sync] Empujando esquema DB"
pnpm --filter @workspace/db run push

echo "[sync] Runtime listo en $(git rev-parse --short HEAD)"
