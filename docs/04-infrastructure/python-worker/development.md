# Python Worker Development Guide

**For:** Local development  
**Last Updated:** 2026-06-14

---

## Prerequisites

- Docker Desktop (installed and running)
- Git
- PowerShell or Terminal

---

## Quick Start

### 1. Clone and Navigate

```bash
cd D:\Projects\collabryx\python-worker
```

### 2. Build Docker Images

```bash
# Build all 4 services (from project root)
cd .. && docker compose build

# Or build from python-worker/ directory
cd D:\Projects\collabryx\python-worker
docker compose build
```

**Expected Output:**
```
✅ embedding-service built (~2.1 GB)
✅ notification-service built (~200 MB)
✅ feed-service built (~180 MB)
✅ match-service built (~180 MB)
```

### 3. Configure Environment

Create a `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Run with Docker Compose

```bash
docker compose up -d
```

This starts all 4 services simultaneously: embedding-service (:8000), notification-service (:8002), feed-service (:8003), and match-service (:8004).

### 5. Verify Health

```bash
# Check all containers are running
docker compose ps

# Check all 4 health endpoints
curl http://localhost:8000/health        # embedding-service
curl http://localhost:8002/health        # notification-service
curl http://localhost:8003/health        # feed-service
curl http://localhost:8004/health        # match-service

# View logs from all services
docker compose logs -f
```

**Expected Health Response (embedding-service):**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

**Expected Health Response (lightweight services):**
```json
{
  "status": "healthy"
}
```

---

## Development Workflow

### View Logs

```bash
# Follow logs
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50

# Specific service
docker-compose logs embedding-service
```

### Restart Service

```bash
# Restart
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

### Stop Service

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## API Testing

### Health Check

```bash
curl http://localhost:8000/health
```

### Get Model Info

```bash
curl http://localhost:8000/model-info
```

### Service Info

```bash
curl http://localhost:8000/
```

### Generate Embedding (Test)

```bash
curl -X POST http://localhost:8000/generate-embedding \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Student React Developer passionate about Fintech\", \"user_id\": \"test-123\"}"
```

**Expected Response:**
```json
{
  "user_id": "test-123",
  "status": "queued",
  "message": "Vector embedding queued for background processing"
}
```

### Generate Embedding from Profile (Test)

```bash
curl -X POST http://localhost:8000/generate-embedding-from-profile \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"test-123\", \"profile_data\": {\"skills\": [\"React\"], \"bio\": \"Developer\"}}"
```

**Expected Response:**
```json
{
  "user_id": "test-123",
  "status": "queued",
  "message": "Vector embedding queued for background processing"
}
```

---

## Debugging

### Shell into Container

```bash
docker-compose exec embedding-service bash
```

### Check Environment Variables

```bash
docker-compose exec embedding-service env | grep SUPABASE
```

### Check Python Dependencies

```bash
docker-compose exec embedding-service pip list
```

### Check Model Cache

```bash
docker-compose exec embedding-service ls -la ~/.cache/torch/sentence_transformers/
```

---

## Common Issues

### Issue: Build Fails with Dependency Errors

**Solution:**
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t collabryx-embedding-service .
```

### Issue: Container Exits Immediately

**Solution:**
```bash
# Check logs
docker-compose logs embedding-service

# Look for errors in startup
```

### Issue: Health Check Fails

**Solution:**
```bash
# Wait 60 seconds for model to load
Start-Sleep -Seconds 60

# Check again
curl http://localhost:8000/health
```

### Issue: Port Already in Use

This can affect any of the 4 service ports (8000, 8002, 8003, 8004).

**Solution:**
```bash
# Find process using a specific port
netstat -ano | findstr :8000
netstat -ano | findstr :8002
netstat -ano | findstr :8003
netstat -ano | findstr :8004

# Kill process
taskkill /PID <PID> /F

# Or change ports in docker-compose.yml
ports:
  - "8001:8000"  # Map embedding-service to 8001
  - "8005:8002"  # Map notification-service to 8005
```

---

## Performance Optimization

### Monitor Resource Usage

```bash
# Stats for all 4 containers
docker stats

# Or check a specific service
docker stats python-worker-embedding-service-1
docker stats python-worker-notification-service-1
```

### Adjust Worker Count

Edit `docker-compose.yml`:

```yaml
command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Adjust Queue Size

Edit `main.py`:

```python
MAX_QUEUE_SIZE = 200  # Increase from 100
MAX_CONCURRENT_PROCESSING = 10  # Increase from 5
```

---

## Clean Up

### Remove Containers

```bash
docker-compose down -v
```

### Remove Images

```bash
# Remove all 4 service images
docker rmi collabryx-embedding-service collabryx-notification-service collabryx-feed-service collabryx-match-service
```

### Remove All Docker Resources

```bash
# WARNING: This removes all unused Docker resources
docker system prune -a --volumes
```

---

## Next Steps

- [Deployment Guide](./deployment.md) - Deploy with Docker
- [Overview](./overview.md) - Service overview and API reference
