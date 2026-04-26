FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src ./src
COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Read-only gaming dataset is baked into the image at /app/seed/.
# entrypoint.sh copies it to the disk-mounted /app/data/ on first boot.
COPY data/gaming_mental_health.sqlite /app/seed/gaming_mental_health.sqlite

ENV PORT=8000
EXPOSE 8000

CMD ["/app/entrypoint.sh"]
