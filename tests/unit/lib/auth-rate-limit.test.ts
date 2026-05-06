/**
 * Auth Rate Limiting Tests — TC-018
 * Verifies that rapid / scripted login attempts are blocked after exceeding
 * the auth rate-limit threshold (5 requests / 15 min).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

function createMockRequest(ip: string = '10.0.0.1', userAgent?: string) {
  return {
    headers: {
      get: (name: string) => {
        switch (name) {
          case 'x-forwarded-for':
            return ip
          case 'x-real-ip':
            return ip
          case 'user-agent':
            return userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          default:
            return null
        }
      },
    },
    nextUrl: new URL('http://localhost:3000/auth/login'),
  } as any
}

describe('Auth Rate Limiting — TC-018', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('auth rate limit configuration', () => {
    it('should allow the first auth request', () => {
      const request = createMockRequest('10.0.0.101')

      const result = rateLimit(request, 'auth')

      expect(result.allowed).toBe(true)
      expect(result.headers['X-RateLimit-Limit']).toBe('5')
      expect(Number(result.headers['X-RateLimit-Remaining'])).toBeGreaterThanOrEqual(0)
    })

    it('should allow exactly the max auth requests before blocking', () => {
      const request = createMockRequest('10.0.0.102')

      // 5 requests within the window should all be allowed
      for (let i = 0; i < 5; i++) {
        const result = rateLimit(request, 'auth')
        expect(result.allowed).toBe(true)
      }
    })

    it('should block the sixth auth request (exceeds max of 5)', () => {
      const request = createMockRequest('10.0.0.103')

      // Fire exactly 5 allowed requests
      for (let i = 0; i < 5; i++) {
        rateLimit(request, 'auth')
      }

      // 6th request should be blocked
      const result = rateLimit(request, 'auth')
      expect(result.allowed).toBe(false)
    })

    it('should return 429 response when auth rate limit is exceeded', () => {
      const request = createMockRequest('10.0.0.104')

      for (let i = 0; i < 5; i++) {
        rateLimit(request, 'auth')
      }

      const result = rateLimit(request, 'auth')

      expect(result.allowed).toBe(false)
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(429)
    })

    it('should include Retry-After header when auth is blocked', () => {
      const request = createMockRequest('10.0.0.105')

      for (let i = 0; i < 5; i++) {
        rateLimit(request, 'auth')
      }

      const result = rateLimit(request, 'auth')

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeDefined()
      expect(typeof result.retryAfter).toBe('number')
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('scripted/bot login detection via rate limiting', () => {
    it('should block rapid scripted login attempts from the same IP', () => {
      const botIp = '192.168.1.200'

      // Simulate rapid-fire login attempts
      for (let i = 0; i < 5; i++) {
        const req = createMockRequest(botIp, `scripted-bot/1.${i}`)
        const result = rateLimit(req, 'auth')
        expect(result.allowed).toBe(true)
      }

      // Next login attempt should be blocked regardless of UA rotation
      const blockedReq = createMockRequest(botIp, 'scripted-bot/2.0')
      const result = rateLimit(blockedReq, 'auth')
      expect(result.allowed).toBe(false)
    })

    it('should track different IPs independently for auth rate limits', () => {
      const attackerIp = '10.0.0.200'
      const normalIp = '10.0.0.201'

      // Exhaust attacker's rate limit
      for (let i = 0; i < 5; i++) {
        rateLimit(createMockRequest(attackerIp), 'auth')
      }

      // Attacker should be blocked
      const attackerResult = rateLimit(createMockRequest(attackerIp), 'auth')
      expect(attackerResult.allowed).toBe(false)

      // Normal user should still be allowed
      const normalResult = rateLimit(createMockRequest(normalIp), 'auth')
      expect(normalResult.allowed).toBe(true)
    })

    it('should return remaining count decreasing with each auth attempt', () => {
      const request = createMockRequest('10.0.0.106')

      const r1 = rateLimit(request, 'auth')
      expect(Number(r1.headers['X-RateLimit-Remaining'])).toBe(4)

      const r2 = rateLimit(request, 'auth')
      expect(Number(r2.headers['X-RateLimit-Remaining'])).toBe(3)

      const r3 = rateLimit(request, 'auth')
      expect(Number(r3.headers['X-RateLimit-Remaining'])).toBe(2)
    })
  })

  describe('auth vs general rate limits', () => {
    it('should have stricter auth limits than general limits', () => {
      const request = createMockRequest('10.0.0.107')

      const authResult = rateLimit(request, 'auth')
      const generalResult = rateLimit(request, 'general')

      expect(authResult.headers['X-RateLimit-Limit']).toBe('5')
      expect(generalResult.headers['X-RateLimit-Limit']).toBe('100')
      expect(Number(authResult.headers['X-RateLimit-Limit'])).toBeLessThan(
        Number(generalResult.headers['X-RateLimit-Limit'])
      )
    })

    it('should track auth and general limits separately', () => {
      const request = createMockRequest('10.0.0.108')

      // Exhaust auth limit
      for (let i = 0; i < 5; i++) {
        rateLimit(request, 'auth')
      }

      // Auth should be blocked
      expect(rateLimit(request, 'auth').allowed).toBe(false)

      // General should still be wide open
      const generalResult = rateLimit(request, 'general')
      expect(generalResult.allowed).toBe(true)
      expect(Number(generalResult.headers['X-RateLimit-Remaining'])).toBeGreaterThan(50)
    })
  })
})
