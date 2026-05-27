#!/bin/bash
set -euo pipefail

echo "[post-merge] SHA activo: $(git rev-parse --short HEAD)"
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
echo "[post-merge] Dependencias y esquema listos"
