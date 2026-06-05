# 🏗️ High-Level & System Architecture Diagrams

> **Last Updated:** 2026-06-05  
> **Scope:** Macro-level architecture showing how Collabryx's multi-runtime stack interacts across presentation, logic, and data layers.

---

## Table of Contents

1. [Conceptual 3-Tier Architecture](#1-conceptual-3-tier-architecture)
2. [Hybrid Service-Based Microservices Topology](#2-hybrid-service-based-microservices-topology)
3. [Production Container Layout (Docker Compose)](#3-production-container-layout-docker-compose)
4. ["Before & After" Evolution Blueprint](#4-before--after-evolution-blueprint)

---

## 1. Conceptual 3-Tier Architecture

Collabryx follows a strict **3-tier architecture** that cleanly separates concerns across three independent layers. The Presentation Layer (Next.js 16) handles all user-facing rendering. The Dual Logic Layer splits business logic between Supabase (for auth, database operations, and edge functions) and the Python FastAPI worker (for compute-heavy embedding generation). The Data Layer is exclusively PostgreSQL 15 via Supabase with the pgvector extension.

```mermaid
graph TB
    subgraph Presentation["🎨 Presentation Layer — Next.js 16 (Vercel)"]
        RSC["Server Components<br/>(Data Fetching, SEO, SSR)"]
        CC["Client Components<br/>(Interactivity, Hooks, State)"]
        API["API Routes + Server Actions<br/>(Edge Runtime)"]
    end

    subgraph Logic["⚙️ Dual Logic Layer"]
        subgraph SupabaseLogic["Supabase Services"]
            Auth["Supabase Auth<br/>(PKCE Flow, SSR Cookies)"]
            Realtime["Realtime Engine<br/>(WebSocket Subscriptions)"]
            Storage["Object Storage<br/>(Avatars, Media, Attachments)"]
            DB_RLS["RLS Policy Engine<br/>(Row-Level Security)"]
        end

        subgraph PythonWorker["Python Microservice"]
            EmbeddingAPI["FastAPI Embedding Service<br/>(Port 8000)"]
            QueueProc["Background Queue Processor<br/>(Pending + DLQ)"]
            ModelInf["Sentence Transformers<br/>(all-MiniLM-L6-v2)"]
        end
    end

    subgraph Data["🗄️ Data Layer — Supabase PostgreSQL 15"]
        PGDB[(PostgreSQL Database)]
        pgvector["pgvector Extension<br/>(384-Dimensional Vectors)"]
        HNSW["HNSW Index<br/>(M=32, ef_construction=128)"]
        CronJobs["Scheduled Functions<br/>(cleanup, aggregation)"]
    end

    RSC -->|Direct DB Queries| PGDB
    CC -->|useQuery / useMutation| API
    API -->|Service Client| PGDB
    API -->|HTTP POST| EmbeddingAPI
    Auth -->|Session Tokens| PGDB
    EmbeddingAPI -->|UPSERT Vectors| PGDB
    QueueProc -->|Atomic Claims| PGDB
    PGDB --> pgvector
    pgvector --> HNSW
    Realtime -->|CDC Events| CC
    PGDB --> CronJobs
```

### Layer Breakdown

**Presentation Layer** runs entirely on Vercel's Edge Network. Server Components fetch data directly from Supabase using the server client (`@/lib/supabase/server`) for zero client-side data exposure. Client Components handle interactivity via React 19 hooks and are placed at the lowest possible leaf nodes. API Routes and Server Actions form the backend-for-frontend (BFF) layer, handling validation with Zod, CSRF protection, and proxying requests to the Python worker.

**Dual Logic Layer** is the architectural centerpiece. Supabase handles auth (PKCE flow with SSR cookies), realtime WebSocket subscriptions for live messaging, object storage for media uploads, and enforces Row-Level Security on every query. The Python FastAPI microservice handles compute-heavy tasks: embedding generation using `all-MiniLM-L6-v2` (384 dimensions), background queue processing with atomic claim patterns, and DLQ management with exponential backoff retry (max 3 attempts).

**Data Layer** is a single Supabase PostgreSQL 15 instance with pgvector. The `profile_embeddings` table stores 384-dimensional vectors and uses an HNSW index (M=32, ef_construction=128) for fast approximate nearest-neighbor search. Scheduled functions handle data retention (cleanup old match suggestions, notification pruning).

---

## 2. Hybrid Service-Based Microservices Topology

Collabryx is **not a monolith**. It employs a hybrid topology where the Next.js application acts as an orchestrating BFF, routing requests to isolated Deno-managed edge functions and a containerized Python microservice based on workload characteristics.

```mermaid
graph TB
    Client["🌐 Browser Client<br/>(Next.js App)"]

    subgraph VercelEdge["Vercel Edge Network"]
        CDN["Static Assets CDN"]
        MW["Middleware<br/>(proxy.ts)"]
        subgraph BFF["Backend-for-Frontend"]
            API_Routes["API Routes<br/>(22+ endpoints)"]
            ServerActions["Server Actions<br/>(10 actions)"]
        end
    end

    subgraph SupabaseEdge["Supabase Ecosystem"]
        AuthService["Auth Service<br/>(PKCE + OAuth)"]
        DB_Service["PostgreSQL 15<br/>+ pgvector"]
        RealtimeBus["Realtime Bus<br/>(WebSocket)"]
        StorageS3["Object Storage<br/>(S3-compatible)"]
    end

    subgraph PythonCluster["Python Microservice Cluster"]
        FastAPI["FastAPI Server<br/>(uvicorn, port 8000)"]
        EmbedGen["Embedding Generator<br/>(Sentence Transformers)"]
        Validator["Embedding Validator<br/>(Nan/Inf/Zero/Dim Checks)"]
        RateLimiter["Rate Limiter<br/>(3 req/hr/user)"]
        PendingQueue["Pending Queue Processor<br/>(30s poll cycle)"]
        DLQProcessor["DLQ Processor<br/>(60s poll cycle)"]
    end

    subgraph WorkerNet["Worker Networking"]
        DockerNet["Docker Bridge Network<br/>(collabryx-network)"]
        HealthCheck["Health Endpoint<br/>(/health)"]
        AuthMW["API Key Auth<br/>(X-Worker-API-Key)"]
    end

    subgraph AIProviders["External AI Providers"]
        OpenAI["OpenAI<br/>(GPT-4o-mini)"]
        Anthropic["Anthropic<br/>(Claude Sonnet 4)"]
        MiniMax["MiniMax<br/>(M2.7)"]
        Others["Others<br/>(Groq, Together, Ollama)"]
    end

    Client -->|Request| MW
    MW -->|Bot Detection| CDN
    MW -->|Protected Routes| API_Routes
    MW -->|Auth Check| AuthService

    API_Routes -->|CRUD + RLS| DB_Service
    API_Routes -->|Chat| RealtimeBus
    API_Routes -->|Upload| StorageS3
    API_Routes -->|Embedding Request| FastAPI

    ServerActions -->|Direct DB| DB_Service
    ServerActions -->|Form Mutation| API_Routes

    FastAPI --> EmbedGen
    EmbedGen --> Validator
    FastAPI --> RateLimiter
    FastAPI --> PendingQueue
    FastAPI --> DLQProcessor
    PendingQueue -->|Atomic Claim| DB_Service
    DLQProcessor -->|Retry Exhausted| DB_Service
    FastAPI --> HealthCheck
    FastAPI --> AuthMW
    AuthMW --> DockerNet

    API_Routes -->|Provider Registry| AIProviders
    API_Routes -->|Fallback Chain| AIProviders
```

---

## 3. Production Container Layout (Docker Compose)

The Python worker runs as a production-grade Docker container with defense-in-depth hardening.

> See full diagram in the original source. Mermaid diagram available in the previous version of this file.

---

## 4. "Before & After" Evolution Blueprint

Collabryx underwent a mid-project architectural transformation from a traditional MERN + Socket.io stack to a modern, AI-native stack.

> See full Before/After comparison in the previous version of this file.

---

> **See also:** [`index.md`](./index.md) for the full diagram catalog, [`erd.md`](./erd.md) for database schema, [`security-architecture.md`](./security-architecture.md) for security state.
