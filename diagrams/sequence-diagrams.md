# 🔄 Sequence Diagrams Reference

> **Last Updated:** 2026-06-05  
> **Purpose:** Central index of all sequence diagrams across the Collabryx documentation.

---

This file catalogs every **sequence diagram** in the project. Each entry links to the source file containing the live Mermaid code. No diagrams are duplicated here — follow the links to view them.

---

## Data Flow & Pipelines

| # | Diagram | Location | Participants | Description |
|---|---------|----------|-------------|-------------|
| 1 | **Async Profile Embedding Pipeline** | [`data-flow-pipelines.md#1-asynchronous-profile-embedding-pipeline`](./data-flow-pipelines.md) | User, Onboarding Form, API, CSRF, Auth, Zod, 5 DB tables, Python Worker, Rate Limiter, Queue, Pending/Dead Letter Queues | Full lifecycle of profile → embedding → storage |
| 2 | **Dual-Chain Content Moderation** | [`data-flow-pipelines.md#4-dual-chain-content-moderation-sequence`](./data-flow-pipelines.md) | User, Form, UI, API, Zod, Fallback Moderator, Python Worker, Moderation Logs, Posts/Comments DB, Realtime | Parallel local + API moderation with aggregation |
| 3 | **Event-Driven Analytics Pipeline** | [`data-flow-pipelines.md#5-event-driven-analytics-pipeline`](./data-flow-pipelines.md) | User, API, Source Tables, Events Table, Triggers, Analytics Functions, user_analytics | Trigger-based event capture → score recalculation |
| 4 | **Deduplicated Profile Visits** | [`data-flow-pipelines.md#6-deduplicated-profile-visits-flow`](./data-flow-pipelines.md) | Viewer Browser, API, profile_visits, user_analytics, increment_profile_views | 7-day dedup window with ON CONFLICT |
| 5 | **Dedicated Bookmarking Flow** | [`data-flow-pipelines.md#7-dedicated-bookmarking-flow`](./data-flow-pipelines.md) | User, API, user_bookmarks, posts, trigger | Bookmark add/remove with counter trigger |

## Behavioral & Event-Driven

| # | Diagram | Location | Participants | Description |
|---|---------|----------|-------------|-------------|
| 6 | **Real-Time Realtime Sync** | [`event-driven-communication.md#1-real-time-realtime-sync-sequence`](./event-driven-communication.md) | User A/B, Client A/B, API, PostgreSQL, Realtime Engine, notifications | CDC-based messaging with optimistic updates |
| 7 | **Hybrid Rendering & Hydration Timeline** | [`event-driven-communication.md#2-nextjs-hybrid-rendering--hydration-timeline`](./event-driven-communication.md) | Browser, Edge, RSC, CC, DB, Python Worker, React Query Cache | 4-phase page load breakdown |
| 8 | **Temporal Cleanup Cron Trigger** | [`event-driven-communication.md#3-temporal-cleanup-cron-trigger`](./event-driven-communication.md) | PG Scheduler, Cleanup Functions, Match/Score/Notification Tables, Admin Dashboard | Automated + on-demand data retention |

## Authentication & Social

| # | Diagram | Location | Participants | Description |
|---|---------|----------|-------------|-------------|
| 9 | **Authentication Flow** | [`docs/02-architecture/diagrams.md#authentication-flow`](../docs/02-architecture/diagrams.md) | User, LoginForm, Supabase Auth, AuthSync, PostgreSQL | PKCE login → auth-sync → redirect chain |
| 10 | **Post Creation Flow** | [`docs/02-architecture/diagrams.md#post-creation-flow`](../docs/02-architecture/diagrams.md) | User, PostForm, createPost action, Audit wrapper, PostgreSQL | Server Action with audit logging |
| 11 | **Matching Algorithm Flow** | [`docs/02-architecture/diagrams.md#matching-algorithm-flow`](../docs/02-architecture/diagrams.md) | User, Matches View, API, Service, PostgreSQL | Cosine similarity + multi-factor scoring |
| 12 | **Real-time Message Flow** | [`docs/02-architecture/diagrams.md#real-time-message-flow`](../docs/02-architecture/diagrams.md) | User 1/2, Client 1/2, PostgreSQL, Realtime | Basic message send/receive via CDC |

---

## Quick Stats

- **Total sequence diagrams:** 12
- **Total diagram source files:** 4 (`data-flow-pipelines.md`, `event-driven-communication.md`, `docs/02-architecture/diagrams.md`)
- **Domains covered:** Embedding pipeline, content moderation, analytics, profile visits, bookmarks, realtime messaging, rendering, cleanup, auth, posts, matching

---

> **Tip:** All sequence diagrams use standard Mermaid syntax with `sequenceDiagram` blocks. They render natively in GitHub, VS Code (with Mermaid extension), and any Mermaid-compatible viewer.
