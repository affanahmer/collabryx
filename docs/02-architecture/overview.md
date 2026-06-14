# 🏗️ Architecture Guide

Comprehensive guide to Collabryx's project structure and architectural decisions.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Directory Structure](#directory-structure)
- [Architecture Patterns](#architecture-patterns)
- [Tech Stack Deep Dive](#tech-stack-deep-dive)
- [Data Flow](#data-flow)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Authentication Flow](#authentication-flow)
- [Database Schema](#database-schema)
- [API Design](#api-design)

---

## Project Overview

Collabryx is built using **Next.js 16+ App Router** with a feature-based architecture. The application follows modern React best practices, leveraging Server Components for performance and Client Components for interactivity.

### Core Principles

1. **Server-First** - Maximize Server Component usage for better performance
2. **Type Safety** - Strict TypeScript throughout the codebase
3. **Feature-Based** - Organize code by features, not file types
4. **Accessibility** - WCAG 2.1 AA compliance as baseline
5. **Performance** - Optimize for Core Web Vitals

---

## Directory Structure

```
collabryx/
│
├── app/                       # Next.js App Router (entry point)
│   ├── (auth)/               # Protected routes (requires authentication)
│   │   ├── ai-mentor/        # AI mentor chat
│   │   ├── analytics/        # Platform analytics
│   │   ├── assistant/        # AI assistant
│   │   ├── bookmarks/        # User bookmarks
│   │   ├── dashboard/        # Main dashboard + feed
│   │   ├── help/             # Help center
│   │   ├── matches/          # Match suggestions
│   │   ├── messages/[id]/    # Chat messages
│   │   ├── my-profile/       # Current user profile
│   │   ├── notifications/    # Notifications center
│   │   ├── onboarding/       # Multi-step onboarding
│   │   ├── post/[id]/        # Post detail
│   │   ├── privacy/          # Privacy policy
│   │   ├── profile/[id]/     # Other user profile
│   │   ├── requests/         # Connection requests
│   │   ├── settings/         # User settings
│   │   └── terms/            # Terms of service
│   │
│   ├── (public)/            # Public routes (no auth required)
│   │   ├── page.tsx         # Landing page
│   │   ├── landing-content.tsx
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   ├── forgot-password/ # Password reset
│   │   ├── reset-password/  # Reset password
│   │   ├── verify-email/    # Email verification
│   │   └── auth-sync/       # Auth callback sync
│   │
│   ├── api/                 # API routes (20+ endpoints)
│   │   ├── activity/        # Activity tracking
│   │   ├── ai/chat/         # AI chat + streaming
│   │   ├── ai-mentor/       # AI mentor messaging
│   │   ├── analytics/       # Daily analytics
│   │   ├── auth/            # Auth callback + login
│   │   ├── chat/            # Chat API
│   │   ├── embeddings/      # Generate + retry DLQ + status
│   │   ├── feed/            # Feed scoring
│   │   ├── health/          # Health check
│   │   ├── matches/         # Generate + batch + health
│   │   ├── moderate/        # Content moderation
│   │   ├── notifications/   # Cleanup + digest + send
│   │   ├── search/          # Global search
│   │   └── upload/          # File upload
│   │
│   ├── globals.css          # Global styles and Tailwind v4
│   ├── layout.tsx           # Root layout component
│   ├── loading.tsx          # Root loading state
│   ├── error.tsx            # Global error boundary
│   └── not-found.tsx        # 404 page
│
├── components/               # React components
│   ├── features/            # Feature-specific (16 domains)
│   │   ├── ai-mentor/       # AI mentor streaming
│   │   ├── analytics/       # Analytics charts
│   │   ├── auth/            # Auth forms (login, register, forgot-password, etc.)
│   │   ├── connections/     # Connection button, list, request items
│   │   ├── dashboard/       # Dashboard + posts (feed, post-card, comments)
│   │   ├── landing/         # Landing page components
│   │   ├── matches/         # Match cards, filters, dialogs
│   │   ├── messages/        # Chat window, sidebar, message input
│   │   ├── notifications/   # Notifications client
│   │   ├── onboarding/      # Multi-step wizard (5 steps)
│   │   ├── posts/           # Post attachment upload
│   │   ├── profile/         # Avatar upload, header, tabs
│   │   ├── requests/        # Requests client
│   │   └── settings/        # Settings tabs (profile, skills, privacy, etc.)
│   │
│   ├── shared/              # Cross-feature components (23)
│   │   ├── glass-card.tsx
│   │   ├── sidebar-nav.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── user-nav-dropdown.tsx
│   │   ├── notification-bell.tsx
│   │   ├── error-boundary.tsx
│   │   └── ... (23 shared components)
│   │
│   ├── ui/                  # shadcn/ui primitives (58 components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   └── providers/           # React context providers
│       ├── query-provider.tsx
│       └── smooth-scroll-provider.tsx
│
├── hooks/                   # Custom React hooks (30)
│   ├── use-auth.ts
│   ├── use-messages.ts
│   ├── use-matches-query.ts
│   ├── use-feed.ts
│   ├── use-connections.ts
│   ├── use-settings.ts
│   ├── use-posts.ts
│   ├── use-analytics.ts
│   └── ... (30 total)
│
├── lib/                     # Library code
│   ├── actions/             # Server Actions (10)
│   ├── ai/                  # AI Provider System
│   │   └── providers/       # Provider implementations
│   ├── config/              # Configuration
│   ├── constants/           # Constants
│   ├── data/                # Data definitions
│   ├── errors/              # Error types
│   ├── prompt/              # AI prompts
│   ├── rag/                 # RAG pipeline
│   ├── services/            # Business logic (17 services)
│   ├── supabase/            # Supabase clients (browser + server)
│   ├── utils/               # Utilities (15)
│   └── validations/         # Zod schemas (5)
│
├── scripts/                 # Automation scripts
│   ├── docker-*.mjs         # Docker management scripts
│   └── seed-data/           # Database seeders
│
├── docs/                    # Documentation (33 files)
├── python-worker/           # 4 FastAPI microservices (embedding, notification, feed, match)
├── supabase/                # Database setup
├── public/                  # Static assets
├── types/                   # TypeScript types
├── proxy.ts                 # Auth middleware
├── render.yaml              # Render deployment config
```

---

## Architecture Patterns

### 1. Feature-Based Architecture

Components are organized by **feature/domain** rather than by technical type.

**Benefits:**
- Better code organization and discoverability
- Easier to scale as features grow
- Natural code splitting boundaries
- Team members can own entire features

**Example:**

```
✅ GOOD (Feature-based)
components/features/
├── assistant/
│   ├── chat-input.tsx
│   ├── message-list.tsx
│   ├── typing-indicator.tsx
│   └── index.ts

❌ BAD (Type-based)
components/
├── inputs/
│   └── chat-input.tsx
├── lists/
│   └── message-list.tsx
└── indicators/
    └── typing-indicator.tsx
```

### 2. Server Component First

By default, all components are **Server Components** unless they need:
- Client-side state (`useState`, `useReducer`)
- Effects (`useEffect`)
- Event handlers (`onClick`, `onChange`)
- Browser APIs

**Benefits:**
- Smaller client bundle size
- Better performance
- Automatic code splitting
- Direct database access

```typescript
// ✅ Server Component (default)
export default async function DashboardPage() {
  const data = await fetchDataFromDB();
  return <DashboardView data={data} />;
}

// ✅ Client Component (when needed)
"use client"
export function InteractiveWidget() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### 3. Route Groups for Organization

Uses Next.js route groups to separate authenticated and public routes:

```
app/
├── (auth)/         # Requires authentication
│   └── layout.tsx  # Shared auth layout
├── (public)/       # Public access
│   └── layout.tsx  # Shared public layout
```

**Benefits:**
- Clear separation of concerns
- Different layouts for auth vs public
- Easier middleware application
- Better code organization

---

## Tech Stack Deep Dive

### Frontend Layer

#### Next.js 16 (App Router)
- **Server Components** for data fetching
- **Client Components** for interactivity
- **Streaming** for progressive rendering
- **Suspense boundaries** for loading states

#### TypeScript 5
- Strict mode enabled
- Path aliases with `@/`
- Generated types from Supabase

#### Tailwind CSS 4
- Utility-first styling
- Custom design tokens
- Responsive by default
- Dark mode support

### UI Component Library

#### shadcn/ui + Radix UI
- **Accessible** - WCAG 2.1 AA compliant
- **Unstyled primitives** - Full control over styling
- **Composable** - Build complex UIs from simple parts
- **Customizable** - Extend and modify as needed

Components are copied into the project (not installed from a registry), giving full control:
```
components/ui/
├── button.tsx      # Customized button component
├── dialog.tsx      # Accessible modal
└── dropdown.tsx    # Dropdown menu
```

### Backend & Database

#### Supabase
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level authorization
- **Realtime** - WebSocket subscriptions for live data
- **Auth** - Built-in authentication with multiple providers
- **Storage** - File upload and management

- **pgvector** - Vector similarity search for semantic matching

### Vector Embeddings System

#### Semantic Matching Architecture

Collabryx uses **vector embeddings** to enable semantic matching between users based on their profiles, skills, and interests.

```
┌─────────────────────────────────────────────────────────────┐
│                    Vector Embedding Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Profile → Semantic Text → Embedding → Vector Storage  │
│       (384 dimensions)             (pgvector)               │
│                                                             │
│  Matching: Cosine Similarity Search on Vector Embeddings    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### AI Provider Architecture

Collabryx uses a **multi-provider registry** for AI mentor functionality, replacing single-provider hardcoding.

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Provider Registry                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client Request → ProviderRegistry → Priority Sort          │
│                        │                                    │
│                        ├─ Provider 1 (priority: 1) ──┐     │
│                        ├─ Provider 2 (priority: 2) ──┤     │
│                        └─ Provider 3 (priority: 3) ──┘     │
│                                                             │
│  Auto-failover: If Provider 1 fails → try Provider 2 → 3   │
│  All providers implement AIProvider interface               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Provider Types:**
- **OpenAICompatibleProvider** — Works with ANY OpenAI-compatible API (OpenAI, Groq, Together, Ollama, local models)
- **AnthropicNativeProvider** — Direct Anthropic API integration

**Auto-Registration:** Providers are automatically registered from `AI_PROVIDER_N_*` environment variables at startup.

#### Embedding Generation

1. **Trigger**: On user onboarding completion
2. **Input**: Profile data (role, headline, bio, skills, interests, goals)
3. **Model**: `all-MiniLM-L6-v2` (384 dimensions, self-hosted)
4. **Storage**: `profile_embeddings` table with pgvector

#### Enhanced RAG Pipeline

The RAG pipeline now supports **multi-user context** and **startup planning**:

- **ExtendedRAGContext** — Combines profile, startup, and multi-user data
- **StartupContext** — Captures startup idea, stage, industry, and needs
- **MultiUserContext** — Enables collaboration advice across multiple users
- **Context Assembler** — Accepts `AssemblerOptions` with `otherUserIds` and `startupContext`

#### Matching Algorithm

```sql
-- Cosine similarity search for semantic matching
SELECT 
    profiles.id,
    1 - (pe.embedding <=> user_embedding) AS similarity
FROM profile_embeddings pe
JOIN profiles ON pe.user_id = profiles.id
WHERE 1 - (pe.embedding <=> user_embedding) > 0.5
ORDER BY similarity DESC
LIMIT 10;
```

#### Components

- **Embedding Service** (`:8000`): FastAPI service running Sentence Transformers for vector embedding generation
- **Notification Service** (`:8002`): FastAPI service handling notification send, digest, and cleanup
- **Feed Service** (`:8003`): FastAPI service implementing Thompson Sampling feed scoring
- **Match Service** (`:8004`): FastAPI service computing cosine similarity + Jaccard match generation

- **Frontend**: Progress UI + automatic generation on onboarding
- **Database**: `profile_embeddings` table with HNSW index

All four services run via `python-worker/docker-compose.yml` on the shared `collabryx-network` Docker bridge. Next.js API routes communicate with them over HTTP using client classes in `lib/worker-client.ts` (`NotificationClient`, `FeedClient`, `MatchClient`).

### State Management

#### React Query (TanStack Query)
- Server state management
- Automatic caching
- Background refetching
- Optimistic updates

```typescript
import { useQuery } from "@tanstack/react-query";

const { data, isLoading } = useQuery({
  queryKey: ["projects"],
  queryFn: () => supabase.from("projects").select("*")
});
```

#### Zustand
- Client-side global state
- Minimal boilerplate
- TypeScript-first

```typescript
import { create } from "zustand";

const useStore = create<State>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}));
```

### Animation Libraries

#### Framer Motion
- Declarative animations
- Layout animations
- Gesture support
- Scroll-triggered animations

#### GSAP
- Timeline-based animations
- Complex sequences
- Performance-optimized

#### Lenis
- Smooth scrolling
- Hardware-accelerated
- Customizable easing

### 3D Visualization

#### Three.js + React Three Fiber
- WebGL rendering
- 3D scene management
- Performance optimizations

#### @react-three/drei
- Helper components
- Camera controls
- 3D text, environment maps, etc.

---

## Data Flow

### 1. Server Component Data Flow

```
┌────────────────┐
│  Server Page   │
│   (RSC)        │
└───────┬────────┘
        │
        ├─ Fetch from Supabase
        │
        ▼
┌────────────────┐
│  Render HTML   │
│  + Stream      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    Client      │
│  Hydration     │
└────────────────┘
```

### 2. Client Component Data Flow

```
┌────────────────┐
│ Client Comp    │
│ useQuery       │
└───────┬────────┘
        │
        ├─ API Route or Direct Supabase
        │
        ▼
┌────────────────┐
│  Cache (RQ)    │
└───────┬────────┘
        │
        ├─ Revalidate
        │
        ▼
┌────────────────┐
│   Re-render    │
└────────────────┘
```

### 3. Form Submission Flow

```
User Input
    │
    ▼
React Hook Form + Zod Validation
    │
    ├─ Invalid → Show Errors
    │
    ▼ Valid
Server Action / API Route
    │
    ├─ Process Data
    │
    ▼
Supabase Database
    │
    ▼
React Query Invalidation
    │
    ▼
UI Update + Toast Notification
```

---

## Component Architecture

### Component Hierarchy

```
┌─────────────────────────────────────┐
│         Root Layout                 │
│  (Theme, Providers, Global Nav)     │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼───────────┐  ┌───▼────────────┐
│ Auth Layout   │  │ Public Layout  │
│ (Dashboard)   │  │ (Marketing)    │
└───┬───────────┘  └───┬────────────┘
    │                  │
    │                  │
┌───▼───────────┐  ┌───▼────────────┐
│   Page        │  │    Page        │
│ (Server RSC)  │  │  (Server RSC)  │
└───┬───────────┘  └───┬────────────┘
    │                  │
    │                  │
┌───▼───────────┐  ┌───▼────────────┐
│ Feature Comp  │  │ Feature Comp   │
│ (Mix of RSC   │  │   (Mix of      │
│  & Client)    │  │  RSC & Client) │
└───┬───────────┘  └───┬────────────┘
    │                  │
    │                  │
┌───▼───────────┐  ┌───▼────────────┐
│  UI Primitive │  │  UI Primitive  │
│  (shadcn/ui)  │  │   (shadcn/ui)  │
└───────────────┘  └────────────────┘
```

### Component Types

#### 1. Page Components (`app/**/page.tsx`)
- Entry points for routes
- Server Components by default
- Fetch data directly

#### 2. Layout Components (`app/**/layout.tsx`)
- Shared UI across routes
- Wrap child pages
- Define metadata

#### 3. Feature Components (`components/features/*`)
- Domain-specific logic
- Can be Server or Client
- Compose UI primitives

#### 4. Shared Components (`components/shared/*`)
- Used across multiple features
- Navigation, headers, footers
- Usually Client Components

#### 5. UI Components (`components/ui/*`)
- Primitive, reusable elements
- From shadcn/ui
- Fully customizable

---

## State Management

### Server State (React Query)

**Use for:**
- API data
- Database queries
- Remote resources

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Client State (Zustand)

**Use for:**
- UI state (modals, sidebar)
- User preferences
- Temporary form state

```typescript
const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));
```

### Form State (React Hook Form)

**Use for:**
- Form inputs and validation

```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

---

## Authentication Flow

```
┌──────────────┐
│   User       │
│  Accesses    │
│  /dashboard  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Middleware  │
│  Check Auth  │
└──────┬───────┘
       │
       ├─ No Session
       │     │
       │     ▼
       │  Redirect to /login
       │
       ├─ Has Session
       │     │
       │     ▼
       │  Allow Access
       │
       ▼
┌──────────────┐
│   Dashboard  │
│   Renders    │
└──────────────┘
```

### Authentication Implementation

```typescript
// proxy.ts (root level - Next.js middleware)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: getCookieUtils(request) }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}
```

---

## Database Schema

### Core Tables

#### `users`
- Extends Supabase Auth users
- Profile information
- Preferences

#### `projects`
- User projects
- Collaboration settings
- Metadata

#### `messages`
- AI chat messages
- User conversations
- Context history

#### `analytics`
- `user_analytics` - per-user engagement tracking
- `platform_analytics` - aggregate platform metrics

#### `content_moderation`
- `content_moderation_logs` - audit trail for flagged content
- Automated and manual moderation actions

#### `search_blocklist`
- Prohibited search terms
- System-managed table (admin-only writes)

### Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Users can only read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Search blocklist is system-managed
CREATE POLICY "System manages blocklist"
ON search_blocklist FOR ALL
USING (is_admin(auth.uid()));
```

---

## API Design

### Route Handlers (`app/api/**/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Handle GET request
  return NextResponse.json({ data: "..." });
}

export async function POST(request: NextRequest) {
  // Handle POST request
  const body = await request.json();
  return NextResponse.json({ success: true });
}
```

### Server Actions (Recommended)

```typescript
"use server"
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const name = formData.get("name");
  
  // Validate
  // Save to DB
  
  revalidatePath("/dashboard");
  return { success: true };
}
```

---

## Performance Considerations

### Bundle Optimization

1. **Code Splitting**
   - Automatic with App Router
   - Dynamic imports for large components

2. **Image Optimization**
   - Use `next/image`
   - Automatic format conversion (WebP)
   - Lazy loading

3. **Font Optimization**
   - Self-hosted fonts
   - Subset only needed characters

### Rendering Strategy

- **Static** - Pre-rendered at build time
- **Dynamic** - Rendered on-demand
- **Streaming** - Incremental rendering

---

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets
   - Use `NEXT_PUBLIC_` prefix for client-exposed vars

2. **Authentication**
   - Always validate on the server
   - Use Supabase RLS for database security

3. **Input Validation**
   - Zod schemas for all inputs
   - Sanitize user content

4. **CORS**
   - Restrict API access
   - Validate origins

---

## Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Query Guides](https://tanstack.com/query/latest/docs)

---

**Last Updated:** 2026-06-05

[← Back to README](../README.md) | [Diagrams →](./diagrams.md)
