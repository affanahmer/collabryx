# 📐 Collabryx Diagram Catalog

> **Last Updated:** 2026-06-05  
> **Purpose:** Master index of all system diagrams with source locations and descriptions.

---

## System Architecture

| Diagram | File | Topics |
|---------|------|--------|
| 3-Tier Architecture | [`system-architecture.md](./system-architecture.md#1-conceptual-3-tier-architecture) | Presentation, Logic, Data layers |
| Hybrid Microservices Topology | [`system-architecture.md](./system-architecture.md#2-hybrid-service-based-microservices-topology) | BFF, Supabase, Python worker, AI providers |
| Docker Container Layout | [`system-architecture.md](./system-architecture.md#3-production-container-layout-docker-compose) | Container security, tmpfs, health check |
| Evolution Blueprint | [`system-architecture.md](./system-architecture.md#4-before--after-evolution-blueprint) | MERN → Current architecture transition |

## Data Flow & Pipelines

| Diagram | File | Topics |
|---------|------|--------|
| Async Profile Embedding | [`data-flow-pipelines.md](./data-flow-pipelines.md#1-asynchronous-profile-embedding-pipeline) | Embedding generation sequence |
| DLQ Fault Tolerance | [`data-flow-pipelines.md](./data-flow-pipelines.md#2-fault-tolerant-dead-letter-queue-dlq-flow) | Dead letter queue retry flow |
| Thompson Sampling Feed | [`data-flow-pipelines.md](./data-flow-pipelines.md#3-thompson-sampling-feed-scorer-workflow) | Multi-armed bandit feed scoring |
| Content Moderation | [`data-flow-pipelines.md](./data-flow-pipelines.md#4-dual-chain-content-moderation-sequence) | Dual-chain moderation pipeline |
| Event-Driven Analytics | [`data-flow-pipelines.md](./data-flow-pipelines.md#5-event-driven-analytics-pipeline) | Database trigger-based analytics |
| Profile Visits Dedup | [`data-flow-pipelines.md](./data-flow-pipelines.md#6-deduplicated-profile-visits-flow) | 7-day sliding window dedup |
| Bookmarking Flow | [`data-flow-pipelines.md](./data-flow-pipelines.md#7-dedicated-bookmarking-flow) | Dedicated bookmark table flow |

## AI, Vectors & Mathematics

| Diagram | File | Topics |
|---------|------|--------|
| Vector Space Mapping | [`ai-vector-mechanics.md](./ai-vector-mechanics.md#1-high-dimensional-vector-space-mapping) | 384-dim embedding, cosine similarity |
| Cosine Similarity Matching | [`ai-vector-mechanics.md](./ai-vector-mechanics.md#2-cosine-similarity-matching-threshold-flowchart) | Threshold scoring, multi-factor engine |
| Multi-LLM Orchestration | [`ai-vector-mechanics.md](./ai-vector-mechanics.md#3-context-injected-multi-llm-orchestration-layout) | Provider registry, RAG assembly, fallback chain |

## Event-Driven & Behavioral

| Diagram | File | Topics |
|---------|------|--------|
| Realtime Sync | [`event-driven-communication.md](./event-driven-communication.md#1-real-time-realtime-sync-sequence) | Supabase Realtime CDC, messaging |
| Rendering Timeline | [`event-driven-communication.md](./event-driven-communication.md#2-nextjs-hybrid-rendering--hydration-timeline) | SSR → Hydration → Interactions |
| Cleanup Cron | [`event-driven-communication.md](./event-driven-communication.md#3-temporal-cleanup-cron-trigger) | Match/notification/feed cleanup |

## Database & ERD

| Diagram | File | Topics |
|---------|------|--------|
| Entity-Relationship Diagram | [`erd.md](./erd.md#1-complete-entity-relationship-diagram-erd) | 39 tables, full relational landscape |

## Security

| Diagram | File | Topics |
|---------|------|--------|
| 5-Layer Security Hierarchy | [`security-architecture.md](./security-architecture.md#1-5-layer-enterprise-security-hierarchy) | Network → Auth → RLS |
| State Separation Map | [`security-architecture.md](./security-architecture.md#2-client-state-vs-server-state-separation-map) | React Query ↔ Zustand ↔ RHF |

## DevOps & Infrastructure

| Diagram | File | Topics |
|---------|------|--------|
| Local Dev Sandbox | [`devops-infrastructure.md](./devops-infrastructure.md#1-tri-language-multi-runtime-local-environment-sandbox) | Node.js + Deno + Python runtimes |
| Data Seeding Blueprint | [`devops-infrastructure.md](./devops-infrastructure.md#2-interactive-multi-module-data-seeding-blueprint) | 8-phase seeding pipeline |
| Production Topology | [`devops-infrastructure.md](./devops-infrastructure.md#3-production-deployment-topology) | Vercel + Supabase + Docker deployment |

---

## Quick Reference

**Total diagrams:** 20  
**Total diagram files:** 9  
**Domain coverage:** Architecture, Data Flow, AI/ML, Security, DevOps, Database, Event-Driven  
**All Mermaid syntax:** Diagrams are written in standard Mermaid.js and render in any Mermaid-compatible Markdown viewer (GitHub, VS Code with Mermaid extension, etc.)
