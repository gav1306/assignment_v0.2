#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="/app/data"
TARGET_DB="${DATA_DIR}/gaming_mental_health.sqlite"

mkdir -p "${DATA_DIR}"

# Download the gaming dataset to the disk on first boot only. The disk-mounted
# file is canonical and survives restarts/redeploys, so subsequent boots skip
# the download. SEED_DB_URL must point at the hosted SQLite (e.g. a GitHub
# Release asset).
if [ ! -f "${TARGET_DB}" ]; then
    if [ -z "${SEED_DB_URL:-}" ]; then
        echo "[entrypoint] ERROR: ${TARGET_DB} missing and SEED_DB_URL is unset." >&2
        exit 1
    fi
    echo "[entrypoint] Downloading seed DB from ${SEED_DB_URL} ..."
    tmp_db="${TARGET_DB}.partial"
    curl --fail --location --show-error --silent --output "${tmp_db}" "${SEED_DB_URL}"
    mv "${tmp_db}" "${TARGET_DB}"
    echo "[entrypoint] Seed DB ready at ${TARGET_DB}."
fi

exec uv run uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
