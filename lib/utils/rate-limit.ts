/**
 * @deprecated Use `lib/rate-limit.ts` directly.
 * This file is kept for backward compatibility only.
 */

export const RATE_LIMITS = {
  LOGIN: { key: "auth:login", maxRequests: 5, windowMs: 15 * 60 * 1000 },
  SIGNUP: { key: "auth:signup", maxRequests: 3, windowMs: 60 * 60 * 1000 },
  PASSWORD_RESET: { key: "auth:password-reset", maxRequests: 3, windowMs: 60 * 60 * 1000 },
  SEND_MESSAGE: { key: "messages:send", maxRequests: 60, windowMs: 60 * 1000 },
  CREATE_POST: { key: "posts:create", maxRequests: 10, windowMs: 60 * 60 * 1000 },
  CREATE_COMMENT: { key: "comments:create", maxRequests: 30, windowMs: 60 * 60 * 1000 },
  API_EMBEDDING: { key: "api:embedding", maxRequests: 5, windowMs: 60 * 60 * 1000 },
  GENERAL: { key: "general", maxRequests: 100, windowMs: 60 * 1000 },
} as const

export async function checkRateLimit(_config: {
  key: string
  maxRequests: number
  windowMs: number
}) {
  throw new Error("checkRateLimit is deprecated. Use rateLimit() from lib/rate-limit.ts instead.")
}

export function withRateLimit<TArgs extends unknown[], TResult>(
  _fn: (...args: TArgs) => Promise<TResult>,
  _config: { key: string; maxRequests: number; windowMs: number }
): (...args: TArgs) => Promise<TResult | { success: false; error: string; retryAfter?: number }> {
  throw new Error("withRateLimit is deprecated. Use rateLimit() from lib/rate-limit.ts directly.")
}
