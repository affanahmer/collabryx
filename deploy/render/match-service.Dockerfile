# Render-specific Dockerfile for match-service
# Build context is repo root (rootDir: . in render.yaml)
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app
RUN pip install --no-cache-dir uv

COPY python-worker/match-service/requirements.txt .
RUN uv pip install --no-cache --system -r requirements.txt

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash appuser

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY python-worker/shared/ ./shared/
COPY python-worker/match-service/ ./match-service/

RUN chown -R appuser:appuser /app
USER appuser

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health

WORKDIR /app/match-service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
