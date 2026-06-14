# Python Worker Deployment Guide

**For:** Local Docker deployment
**Last Updated:** 2026-06-14

---

## Overview

This guide covers deploying all four Python Worker microservices using Docker Compose: embedding-service (~2.1 GB), notification-service (~200 MB), feed-service (~180 MB), and match-service (~180 MB).

### Pre-deployment Checklist

- [ ] Supabase credentials ready
- [ ] Environment variables documented for all services
- [ ] All 4 health check endpoints verified
- [ ] Resource requirements understood (3 GB+ RAM total; embedding-service needs ~2 GB)

---

## Docker Deployment

### Step 1: Build Images

Build all 4 service images at once:

```bash
# From project root
docker compose -f python-worker/docker-compose.yml build
```

Or from the `python-worker` directory:

```bash
cd python-worker
docker compose build
```

To build individual services (faster iteration):

```bash
docker compose build embedding-service
docker compose build notification-service
```

### Step 2: Configure Environment

Create a `.env` file in `python-worker/` with your Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

All 4 services read from the same `.env` file.

### Step 3: Run Containers

Start all 4 services:

```bash
docker compose up -d
```

This starts embedding-service on port 8000, notification-service on port 8002, feed-service on port 8003, and match-service on port 8004.

### Full docker-compose.yml

```yaml
# python-worker/docker-compose.yml
name: collabryx-workers

services:
  embedding-service:
    build:
      context: .
      dockerfile: embed-service/Dockerfile
    ports:
      - "8000:8000"
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    deploy:
      resources:
        limits:
          memory: 4G
    networks:
      - collabryx-network

  notification-service:
    build:
      context: .
      dockerfile: notification-service/Dockerfile
    ports:
      - "8002:8002"
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - collabryx-network

  feed-service:
    build:
      context: .
      dockerfile: feed-service/Dockerfile
    ports:
      - "8003:8003"
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - collabryx-network

  match-service:
    build:
      context: .
      dockerfile: match-service/Dockerfile
    ports:
      - "8004:8004"
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - collabryx-network

networks:
  collabryx-network:
    name: collabryx-network
    driver: bridge
```

### Step 4: Verify Deployment

```bash
# Check all 4 health endpoints
curl http://localhost:8000/health   # embedding-service
curl http://localhost:8002/health   # notification-service
curl http://localhost:8003/health   # feed-service
curl http://localhost:8004/health   # match-service

# Expected (embedding-service):
{
  "status": "healthy",
  "model_loaded": true
}

# Expected (lightweight services):
{
  "status": "healthy"
}
```

---

## Post-Deployment Verification

### 1. All Services Health Check

```bash
# Verify all 4 services are responding
for port in 8000 8002 8003 8004; do
  echo "=== Service :$port ==="
  curl -s "http://localhost:$port/health" | python -m json.tool
  echo
done
```

**Expected (embedding-service on :8000):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime_seconds": >0
}
```

**Expected (notification-service on :8002, feed-service on :8003, match-service on :8004):**
```json
{
  "status": "healthy"
}
```

### 2. Test Embedding Generation

```bash
curl -X POST http://localhost:8000/generate-embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Student React Developer passionate about Fintech",
    "user_id": "test-user-123"
  }'
```

**Expected:**
```json
{
  "user_id": "test-user-123",
  "status": "queued",
  "message": "Vector embedding queued for background processing"
}
```

### 3. Check Metrics

```bash
# Model info (embedding-service only)
curl http://localhost:8000/model-info

# Service info
curl http://localhost:8000/

# Verify all 4 are running in Docker
docker compose ps
```

---

## Security Best Practices

### 1. Environment Variables

Never commit `.env` files:

```bash
# Add to .gitignore
.env
.env.*.local
```

### 2. Network Security

All 4 services share the `collabryx-network` bridge network, isolating them from other Docker networks while allowing inter-service communication:

```yaml
# docker-compose.yml
networks:
  collabryx-network:
    name: collabryx-network
    driver: bridge
```

### 3. SSL/TLS

- Use a reverse proxy (e.g., nginx, Caddy) for TLS termination
- Or deploy behind a cloud load balancer with automatic HTTPS

---

## Troubleshooting

### Issue: Service Crashes on Startup

**Solution:**
```bash
# Check logs for a specific service
docker compose logs embedding-service
docker compose logs notification-service
docker compose logs feed-service
docker compose logs match-service

# Common causes:
# - Missing environment variables
# - Insufficient memory (especially embedding-service)
# - Model loading timeout (embedding-service only)
```

### Issue: Health Check Fails

**Solution:**
```bash
# For embedding-service: increase start period (model loads slowly)
healthcheck:
  start_period: 120s  # Increase from default

# For lightweight services: check if service is running
docker compose ps <service-name>

# Check service logs for errors
docker compose logs <service-name>
```

### Issue: High Memory Usage

**Solution:**
```yaml
# For embedding-service only: limit concurrent processing
# In embed-service/main.py:
MAX_CONCURRENT_PROCESSING = 3  # Reduce from 5
```

The other 3 services (notification, feed, match) are lightweight and typically use under 200 MB each. If they show high memory usage, check for connection leaks or unbounded queue growth.

### Issue: Port Already in Use

Any of ports 8000, 8002, 8003, or 8004 may be in use.

**Solution:**
```bash
# Edit docker-compose.yml to change host port mappings
# For example, to use 8001 instead of 8000:
ports:
  - "8001:8000"
```

---

## Rollback

To rollback all 4 services:

```bash
# Stop and remove all containers
docker compose down

# Rebuild with previous image tag
docker compose build --no-cache

# Restart
docker compose up -d
```

To rollback a single service (e.g., embedding-service):

```bash
# Rebuild just one service
docker compose build --no-cache embedding-service

# Restart just that service
docker compose up -d embedding-service
```

---

## Next Steps

- [Development Guide](./development.md) - Local development setup
- [Overview](./overview.md) - Service overview and API reference

---

## Support

For issues or questions:
- Check logs: `docker compose logs <service-name>`
- Review [Troubleshooting](#troubleshooting) section
- Contact DevOps team
