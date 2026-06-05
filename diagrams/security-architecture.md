# 🛡️ Security Architecture & State Management Diagrams

> **Last Updated:** 2026-06-05  
> **Scope:** Multi-layer enterprise security hierarchy and client-server state separation patterns.

---

## Table of Contents

1. [5-Layer Enterprise Security Hierarchy](#1-5-layer-enterprise-security-hierarchy)
2. [Client-State vs. Server-State Separation Map](#2-client-state-vs-server-state-separation-map)

---

## 1. 5-Layer Enterprise Security Hierarchy

Collabryx implements a defense-in-depth security architecture with five distinct layers, from network edge to database row-level policies.

```mermaid
graph TB
    subgraph Internet["🌐 Internet / External Traffic"]
        Attacker["Malicious Actor"]
        Bot["Automated Bot"]
        LegitUser["Legitimate User"]
    end

    subgraph L1["🔒 Layer 1: Network Edge — Input Sanitization"]
        HTTPS["TLS 1.3 — All traffic encrypted"]
        CORS["CORS Middleware<br/>Allow specific origins only"]
        BodyLimit["Request Body Limit<br/>Max 10MB for API routes<br/>(proxy.ts check)"]
        CSP["Content-Security-Policy<br/>Headers set by Next.js"]
    end

    subgraph L2["🛡️ Layer 2: Application Gateway — Rate Limiting"]
        BotDetection["Bot Detection (proxy.ts)<br/>• User-Agent analysis<br/>• Request pattern scoring<br/>• Block if score > threshold<br/>• Sets X-Bot-Score header"]
        RateLimit["API Rate Limiting<br/>• lib/rate-limit middleware<br/>• Per-user + per-IP limits<br/>• 429 responses with Retry-After<br/>• Applies to: cleanup, embeddings"]
        CSRF["CSRF Protection<br/>• lib/csrf module<br/>• Token validation on mutations<br/>• Double-submit cookie pattern"]
    end

    subgraph L3["🔑 Layer 3: Authentication & Session Security"]
        SupabaseAuth["Supabase Auth<br/>• PKCE OAuth flow<br/>• SSR cookie-based sessions<br/>• Multiple providers (Google, GitHub, Email)"]
        SessionMgmt["Session Management<br/>• proxy.ts middleware<br/>• Protected route guard<br/>• Onboarding redirect logic<br/>• Auth sync endpoints"]
        JWT["JWT Token Security<br/>• Short-lived access tokens<br/>• Refresh token rotation<br/>• Secure httpOnly cookies"]
    end

    subgraph L4["📝 Layer 4: Input Validation & Content Security"]
        ZodValidation["Zod Schema Validation<br/>• API routes: each has schema<br/>• Server Actions: validated<br/>• Search params: sanitized<br/>• File uploads: size + type"]
        Moderation["Content Moderation<br/>• Dual-chain (fallback + API)<br/>• Toxicity + spam + PII + NSFW check<br/>• Auto-reject or flag for review"]
        Sanitize["HTML Sanitization<br/>• User content sanitized<br/>• No raw HTML rendering<br/>• XSS prevention"]
    end

    subgraph L5["🗄️ Layer 5: Database Security — Row Level Security"]
        RLS["Supabase RLS Policies<br/>(100+ policies across all 39 tables)"]
        Policies["Policy Categories:<br/>• SELECT: User reads own data<br/>• INSERT: User creates own<br/>• UPDATE: User modifies own<br/>• DELETE: Owner or admin only"]
        ServiceRole["Service Role Client<br/>• Used ONLY in:<br/>  - Python worker (background jobs)<br/>  - Server Actions (admin operations)<br/>  - Cleanup tasks<br/>• Never in client-side code"]
        RLS_Examples["Example Policies:<br/>• 'Users can view own profile'<br/>  USING (auth.uid() = id)<br/>• 'Users can update own profile'<br/>  USING (auth.uid() = id)<br/>• 'Admins can view all'<br/>  USING (is_admin(auth.uid()))"]
    end

    subgraph DefenseOutcomes["✅ Defense Outcomes"]
        Blocked["Requests blocked at earliest layer"]
        Logged["All access attempts logged in audit_logs"]
        Alerted["Admin alerted on critical failures"]
        Compliant["GDPR-compliant data handling"]
    end

    Attacker -->|"TLS 1.3"| L1
    Bot -->|"Bot detection"| L2
    LegitUser -->|"Valid session"| L3

    L1 --> L2
    L2 -->|"Rate-limited"| L3
    L2 -->|"Blocked"| Blocked
    L3 -->|"Authenticated"| L4
    L3 -->|"Unauthenticated"| Blocked
    L4 -->|"Validated"| L5
    L4 -->|"Rejected"| Blocked
    L5 -->|"RLS Pass"| LegitUser
    L5 -->|"RLS Fail"| Blocked

    L1 --> Logged
    L2 --> Logged
    L3 --> Logged
    L4 --> Logged
    L5 --> Logged
```

### Defense-in-Depth Details

**Layer 1 (Network Edge)** — All traffic is encrypted with TLS 1.3. The CORS middleware in the Python worker restricts origins to the configured `ALLOWED_ORIGINS` (default: `http://localhost:3000`). Next.js sets Content-Security-Policy headers. The `proxy.ts` middleware enforces a 10MB request body limit for API routes.

**Layer 2 (Application Gateway)** — Bot detection runs first in the middleware: `checkBot()` analyzes User-Agent, path patterns, and request characteristics. If `shouldBlockBot()` returns true, the request is rejected with HTTP 403 and an `X-Bot-Score` header. API rate limiting applies per-endpoint: the notification cleanup endpoint allows 10 requests per hour, the embedding generation endpoint has per-user limits enforced by the Python worker (3 requests per hour per user with sliding window via `embedding_rate_limits` table). CSRF protection uses a double-submit cookie pattern on all state-changing requests.

**Layer 3 (Authentication)** — Supabase Auth handles PKCE OAuth flow with SSR cookie-based sessions. The `proxy.ts` middleware checks for authenticated sessions on protected routes (`/dashboard`, `/assistant`, `/matches`, `/messages`, `/my-profile`, `/notifications`, etc.) and redirects to `/login` with a `redirectTo` parameter for post-login navigation.

**Layer 4 (Input Validation)** — Every API endpoint validates with a dedicated Zod schema. Server Actions use schema validation before any database operation. File uploads are limited by both size and MIME type. The content moderation pipeline acts as a secondary filter, scanning for toxicity, spam, PII, and NSFW content. Moderation results are persisted to `content_moderation_logs`.

**Layer 5 (Database RLS)** — All 39 tables have Row-Level Security enabled with over 100 policies. The pattern is consistent: `SELECT` policies allow users to read their own data, `INSERT` policies verify the user is creating their own record (using `auth.uid()` = user_id), `UPDATE` policies check ownership, and `DELETE` policies require ownership or admin role. The service role key is used exclusively by the Python worker (for background embedding operations) and by server-side admin actions — it is **never** exposed to client-side code.

---

## 2. Client-State vs. Server-State Separation Map

Collabryx strictly separates data responsibilities between the server and client. Server-managed data is cached and validated via **React Query 5** (TanStack Query), while interactive, volatile UI interface state is captured by **Zustand 5**.

```mermaid
graph TB
    subgraph App["Collabryx Application State"]
        direction TB
    end

    subgraph ServerState["☀️ Server State (React Query 5)"]
        direction TB

        Title1["Data Source: Supabase PostgreSQL + API Routes<br/>Caching: Automatic with configurable staleTime<br/>Invalidation: On mutation success or manual refetch"]

        subgraph Queries["Query Categories"]
            Q1["🔍 User Data Queries<br/>• useQuery(['profile'], fetchCurrentProfile)<br/>  staleTime: 5min<br/>• useQuery(['matches'], fetchMatches)<br/>  staleTime: 2min<br/>• useQuery(['feed'], fetchFeedScores)<br/>  staleTime: 1min"]
            Q2["💬 Messaging Queries<br/>• useQuery(['conversations'], ...)<br/>  staleTime: 30s<br/>• useInfiniteQuery(['messages', id], ...)<br/>  staleTime: 30s"]
            Q3["🔔 Notification Queries<br/>• useQuery(['notifications'], ...)<br/>  staleTime: 1min"]
            Q4["📊 Analytics Queries<br/>• useQuery(['analytics'], ...)<br/>  staleTime: 10min"]
        end

        subgraph Mutations["Mutation Patterns"]
            M1["Optimistic Updates<br/>onMutate: setQueryData (UI instant)<br/>onError: rollback cache<br/>onSettled: refetch queries"]
            M2["Examples:<br/>• Like post (optimistic like_count)<br/>• Send message (optimistic insert)<br/>• Update profile (optimistic edit)"]
        end

        subgraph Cache["Cache Configuration"]
            C1["Default staleTime: 30s — 10min<br/>(depends on data volatility)"]
            C2["gcTime (garbage collection): 5min<br/>— keeps data in memory for navigation"]
            C3["RefetchOnWindowFocus: true<br/>RefetchOnReconnect: true"]
            C4["Background refetch on stale<br/>— seamless fresh data"]
        end
    end

    subgraph ClientState["🌙 Client State (Zustand 5)"]
        direction TB

        Title2["Scope: UI-only, ephemeral, non-persisted state<br/>Persistence: Zustand persist middleware (localStorage)<br/>Re-renders: Subscribe to slices, not full store"]

        subgraph Stores["Store Architecture"]
            S1["🧩 UI Store<br/>{<br/>  sidebarOpen: boolean,<br/>  activeTab: string,<br/>  isMobileMenuOpen: boolean,<br/>  toggleSidebar: () => void<br/>}"]
            S2["🔔 Notification Store<br/>{<br/>  unreadCount: number,<br/>  incrementUnread: () => void,<br/>  resetUnread: () => void<br/>}"]
            S3["⚙️ Theme Store<br/>{<br/>  theme: 'light' | 'dark' | 'system',<br/>  setTheme: (theme) => void<br/>}<br/>(persisted to localStorage)"]
        end

        subgraph Patterns["Zustand Patterns Used"]
            Z1["selective subscriptions<br/>const sidebarOpen = useUIStore(s => s.sidebarOpen)"]
            Z2["No prop drilling<br/>Components read store directly"]
            Z3["Server-client hybrid<br/>Initial server state → Zustand hydration"]
        end
    end

    subgraph FormState["📋 Form State (React Hook Form)"]
        direction TB

        F1["Temporary form data<br/>• useForm() with ZodResolver<br/>• Unsaved input state<br/>• Validation errors<br/>• Touched/dirty tracking"]
        F2["Submit via Server Action or API Route<br/>→ On success: invalidate React Query cache"]
    end

    subgraph Boundary["🔀 State Boundary Decision Flow"]
        B1["Is this data from the server?<br/>↳ YES → React Query<br/>↳ NO → ↓"]
        B2["Is this UI-only ephemeral state?<br/>↳ YES → Zustand<br/>↳ NO → ↓"]
        B3["Is this form input state?<br/>↳ YES → React Hook Form<br/>↳ NO → useState / useReducer"]
    end

    ServerState --- Boundary
    ClientState --- Boundary
    FormState --- Boundary
    Boundary --- B1
    Boundary --- B2
    Boundary --- B3
```

### State Separation Principles

**React Query 5** owns all server-derived data: profiles, matches, feed scores, messages, notifications, and analytics. Each query has a configurable `staleTime` based on data volatility: profile data is cached for 5 minutes (it changes infrequently), feed scores for 1 minute (new posts arrive), messages for 30 seconds (high churn). Mutations use optimistic updates: when a user likes a post, the UI increments the count immediately via `setQueryData`, and on server confirmation the cache is reconciled. If the mutation fails, the optimistic update is rolled back transparently.

**Zustand 5** owns client-only UI state: sidebar open/closed, active tab selection, mobile menu visibility, and theme preference. Each store is a lightweight object with selective subscription (`useUIStore(s => s.sidebarOpen)`) to prevent unnecessary re-renders. The theme store uses Zustand's `persist` middleware to save to localStorage. Zustand stores are **never** used for server data — that would bypass React Query's caching, deduplication, and background refetching.

**React Hook Form** owns form input state: the onboarding wizard, profile editor, and post creator. Each form is validated against a Zod schema on every change (or on submit, depending on the UX requirement). On successful submission, the form calls a Server Action or API route, which invalidates the relevant React Query cache keys to trigger a refetch.

The **decision boundary** is simple: if the data originates from the server (database, API), it goes in React Query. If it's UI-only ephemeral state (modals, toggles, selections), it goes in Zustand. If it's form input, it goes in React Hook Form.

---

> **See also:** [`erd.md`](./erd.md) for RLS table details, [`docs/SECURITY.md`](../docs/SECURITY.md) for security best practices.
