#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="/app/data"
SEED_DB="/app/seed/gaming_mental_health.sqlite"
TARGET_DB="${DATA_DIR}/gaming_mental_health.sqlite"

mkdir -p "${DATA_DIR}"

# Seed the disk with the gaming dataset on first boot only. After that the
# disk-mounted file is canonical and survives restarts/redeploys.
if [ ! -f "${TARGET_DB}" ]; then
    echo "[entrypoint] Seeding ${TARGET_DB} from image..."
    cp "${SEED_DB}" "${TARGET_DB}"
fi

exec uv run uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
