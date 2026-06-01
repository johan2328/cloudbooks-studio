#!/bin/bash
set -euo pipefail

echo "[post-merge] SHA activo: $(git rev-parse --short HEAD)"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install --no-package-lock
fi
npm --workspace @workspace/db run push
echo "[post-merge] Dependencias y esquema listos"
