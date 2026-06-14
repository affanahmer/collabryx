# Python Worker Microservice Suite

Four FastAPI microservices powering semantic matching, notifications, feed scoring, and match generation. All services run via Docker Compose.

---

## Table of Contents

- [Overview](#overview)
- [Service Architecture](#service-architecture)
- [Setup](#setup)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Python Worker suite consists of four FastAPI microservices that power Collabryx's backend AI pipeline. All services run via `python-worker/docker-compose.yml` and share the `collabryx-network` bridge network. A `shared/` directory provides reusable Python modules (`db.py`, `middleware.py`, `logging_config.py`) used across all services.

### Key Features

- **Model (embedding-service)**: `all-MiniLM-L6-v2` (384 dimensions)
- **Framework**: FastAPI (all 4 services)
- **Orchestration**: Docker Compose with shared `collabryx-network`
- **Shared Modules**: `shared/db.py`, `shared/middleware.py`, `shared/logging_config.py`
- **Scalability**: Each service is stateless and horizontally scalable

---

## Service Architecture

All four microservices run together via a single `docker-compose.yml` file in `python-worker/`. They communicate over the `collabryx-network` bridge and are consumed by Next.js API routes through client classes in `@/lib/worker-client.ts`.

### Services Overview

| Service | Port | Image Size | Key Dependencies | Role |
|---------|------|------------|-----------------|------|
| `embedding-service` | 8000 | ~2.1 GB | PyTorch, Sentence Transformers | Generate vector embeddings for semantic profile matching |
| `notification-service` | 8002 | ~200 MB | httpx, supabase | Send and digest notifications |
| `feed-service` | 8003 | ~180 MB | httpx, supabase | Thompson Sampling feed scoring |
| `match-service` | 8004 | ~180 MB | httpx, supabase | Cosine similarity + Jaccard match generation |

The `embedding-service` is the only service with PyTorch / Sentence Transformers, accounting for its larger footprint (~2.1 GB). The other three services are lightweight (~180-200 MB each) and do not require torch.

### Directory Layout

```
python-worker/
├── docker-compose.yml          # Orchestrates all 4 services
├── shared/                     # Reusable Python modules
│   ├── db.py                   # Database helpers
│   ├── middleware.py            # Shared middleware
│   └── logging_config.py       # Logging configuration
├── embed-service/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── notification-service/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── feed-service/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── match-service/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
```

### Docker Commands

All services are managed through `bun run docker:*` scripts from the project root:

```bash
bun run docker:up        # Start all 4 services
bun run docker:down      # Stop all services
bun run docker:logs      # View logs from all services
bun run docker:rebuild   # Rebuild and restart all services
```

---

## Setup

### Prerequisites

- Python 3.9+
- pip
- 512MB+ RAM

### Installation

```bash
cd python-worker

# Create virtual environment
python -m venv venv

# Activate environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Requirements

```txt
fastapi==0.115.6
uvicorn[standard]==0.32.0
sentence-transformers==3.3.1
pydantic==2.9.2
pydantic-settings==2.6.1
python-dotenv==1.0.1
httpx>=0.24.0
supabase>=2.3.0
tenacity==9.0.0
```

---

## Development

### Start Development Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Model info
curl http://localhost:8000/model-info

# Generate embedding
curl -X POST http://localhost:8000/generate-embedding \
  -H "Content-Type: application/json" \
  -d '{"text": "Software engineer skilled in React", "user_id": "test-123"}'
```

---

## Deployment

### Docker (All Services)

```bash
# Build all 4 service images
docker compose -f python-worker/docker-compose.yml build

# Start all services
docker compose -f python-worker/docker-compose.yml up -d
```

For individual service builds (faster iteration):

```bash
# Build only embedding-service
docker compose -f python-worker/docker-compose.yml build embedding-service

# Build only a lightweight service
docker compose -f python-worker/docker-compose.yml build notification-service
```

---

## API Reference

> **Note:** The endpoints below belong to the **embedding-service** (port 8000). Each microservice has its own set of endpoints — see individual service docs for notification, feed, and match APIs.

### `GET /`

Service info (embedding-service).

**Response:**
```json
{
  "service": "collabryx-embedding-worker",
  "version": "3.0.0",
  "description": "Core embedding service"
}
```

### `GET /health`

Health check with system metrics.

**Response:**
```json
{
  "status": "healthy",
  "model_info": {
    "model_name": "all-MiniLM-L6-v2",
    "dimensions": 384
  }
}
```

### `GET /model-info`

Model information.

**Response:**
```json
{
  "model_name": "all-MiniLM-L6-v2",
  "dimensions": 384,
  "device": "cpu"
}
```

### `POST /generate-embedding`

Queue embedding generation.

**Request:**
```json
{
  "text": "Software Engineer with 5 years experience...",
  "user_id": "user-123"
}
```

**Response:**
```json
{
  "user_id": "user-123",
  "status": "queued",
  "message": "Vector embedding queued for background processing"
}
```

### `POST /generate-embedding-from-profile`

Queue embedding generation from profile data.

**Request:**
```json
{
  "user_id": "user-123",
  "profile_data": {
    "skills": ["React", "TypeScript"],
    "bio": "Software engineer...",
    "interests": ["Fintech", "AI"]
  }
}
```

**Response:**
```json
{
  "user_id": "user-123",
  "status": "queued",
  "message": "Vector embedding queued for background processing"
}
```

---

## Troubleshooting

### Issue: Model Loading Fails

**Symptoms:**
- Error: "Error loading model"
- 500 on first request

**Solutions:**
1. Check disk space (model needs ~500MB)
2. Verify internet connection for initial download
3. Pre-download model: `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`

### Issue: High Memory Usage

**Symptoms:**
- Worker crashes with OOM
- Memory > 1GB (embedding-service only; other services use ~200MB)

**Solutions:**
1. Reduce batch size
2. Use CPU-only mode (slower but less memory)
3. Increase container memory limit
4. Note: notification-service, feed-service, and match-service are lightweight (~180-200MB each, no torch)

### Issue: Slow Embedding Generation

**Symptoms:**
- Embedding takes > 1 second
- Queue builds up

**Solutions:**
1. Enable GPU acceleration
2. Scale horizontally (multiple workers)
3. Use model quantization

---

**Last Updated**: 2026-05-22  
**Version**: 3.0.0

[← Back to Docs](../../README.md) | [Vector Embeddings →](../../docs/03-core-features/vector-embeddings/overview.md)
