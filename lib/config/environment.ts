/**
 * Environment Configuration
 * Centralizes all env var access with dev/prod detection
 */

/**
 * Environment Configuration
 * Resolves microservice URLs based on deployment context:
 *   - Production (NODE_ENV=production) → uses dedicated remote service URLs
 *   - Docker  → uses host.docker.internal:{port}
 *   - Local   → uses localhost:{port}
 *
 * CRITICAL: Remote service URLs (EMBEDDING_SERVICE_URL, etc.) are
 * ONLY used when NODE_ENV=production. In dev/preview/local mode,
 * the app always uses Docker or localhost — even if the env var is set.
 * This prevents accidental routing to production services during dev.
 */

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction

// Local fallback ports for each microservice
const PORTS = {
  embedding: process.env.EMBEDDING_SERVICE_PORT || '8000',
  notification: process.env.NOTIFICATION_SERVICE_PORT || '8002',
  feed: process.env.FEED_SERVICE_PORT || '8003',
  match: process.env.MATCH_SERVICE_PORT || '8004',
} as const

function resolveServiceUrl(envVar: string | undefined, dockerPort: string, localPort: string): string {
  // Priority: 1. Production env var → 2. Docker → 3. Local
  // Only read the env var in production — dev always uses Docker/localhost
  if (isProduction && envVar) return envVar
  if (process.env.IN_DOCKER_CONTAINER === 'true') return `http://host.docker.internal:${dockerPort}`
  return `http://localhost:${localPort}`
}

export const config = {
  environment: isProduction ? 'production' : 'development',
  isProduction,
  isDevelopment,

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? (() => {
      console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is not set')
      return ''
    })(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? (() => {
      console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
      return ''
    })(),
  },

  /** Embedding service — runs on HF Spaces in production */
  embedding: {
    url: resolveServiceUrl(
      process.env.EMBEDDING_SERVICE_URL || process.env.NEXT_PUBLIC_WORKER_API_URL,
      PORTS.embedding,
      PORTS.embedding,
    ),
    healthUrl: (process.env.EMBEDDING_SERVICE_URL || process.env.NEXT_PUBLIC_WORKER_API_URL || `http://localhost:${PORTS.embedding}`) + '/health',
  },

  /** Backward-compat alias: worker → embedding */
  worker: {
    url: isProduction
      ? (process.env.EMBEDDING_SERVICE_URL || process.env.NEXT_PUBLIC_WORKER_API_URL || `http://localhost:${PORTS.embedding}`)
      : (process.env.IN_DOCKER_CONTAINER === 'true' ? 'http://host.docker.internal:8000' : 'http://localhost:8000'),
    healthUrl: isProduction
      ? ((process.env.EMBEDDING_SERVICE_URL || process.env.NEXT_PUBLIC_WORKER_API_URL || `http://localhost:${PORTS.embedding}`) + '/health')
      : ((process.env.IN_DOCKER_CONTAINER === 'true' ? 'http://host.docker.internal:8000' : 'http://localhost:8000') + '/health'),
  },

  /** Notification service — runs on Render free tier in production */
  notification: {
    url: resolveServiceUrl(
      process.env.NOTIFICATION_SERVICE_URL,
      PORTS.notification,
      PORTS.notification,
    ),
    healthUrl: (process.env.NOTIFICATION_SERVICE_URL || `http://localhost:${PORTS.notification}`) + '/health',
  },

  /** Feed scoring service — runs on Render free tier in production */
  feed: {
    url: resolveServiceUrl(
      process.env.FEED_SERVICE_URL,
      PORTS.feed,
      PORTS.feed,
    ),
    healthUrl: (process.env.FEED_SERVICE_URL || `http://localhost:${PORTS.feed}`) + '/health',
  },

  /** Match generation service — runs on Render free tier in production */
  match: {
    url: resolveServiceUrl(
      process.env.MATCH_SERVICE_URL,
      PORTS.match,
      PORTS.match,
    ),
    healthUrl: (process.env.MATCH_SERVICE_URL || `http://localhost:${PORTS.match}`) + '/health',
  },

  features: {
    enableRealtime: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    enableWorker: Boolean(isProduction ? (process.env.EMBEDDING_SERVICE_URL || process.env.NEXT_PUBLIC_WORKER_API_URL) : true),
  },
} as const

export type Config = typeof config
