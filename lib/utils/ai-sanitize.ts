/**
 * ============================================================================
 * AI-Specific Input Sanitization — Prompt Injection Defense
 * ============================================================================
 *
 * Provides a production-grade sanitization layer specifically for AI user
 * inputs. Neutralizes prompt injection, jailbreak attempts, XSS, role-
 * override, and template injection patterns BEFORE they reach the LLM.
 *
 * This is applied in the streaming API route as defense-in-depth, layered
 * on top of the existing sanitize utilities and Zod validation.
 *
 * @see {@link ./sanitize.ts} — base sanitization utilities
 * @see {@link ./sanitize-input.ts} — comprehensive input sanitization
 * ============================================================================
 */

import { sanitizeText, stripHtml, sanitizeMarkdown, escapeHtml } from './sanitize'

/**
 * Known prompt injection and jailbreak patterns to neutralize.
 * These are matched BEFORE HTML stripping so that delimiter-based
 * injections (e.g., <|system|>) are caught at the text level.
 */
const JAILBREAK_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  // System role delimiter injection — inline or line-start
  { pattern: /\bSYSTEM\s*:\s*/gi, replace: '[filtered_system:] ' },
  // <|system|> delimiters
  { pattern: /<\|system\|>/gi, replace: '[filtered]' },
  // [SYSTEM] brackets
  { pattern: /\[SYSTEM\]/gi, replace: '[filtered]' },
  // Ignore/forget/override previous instructions (classic jailbreak)
  { pattern: /(Ignore|Forget|Disregard|Override)\s+(all\s+)?previous\s+(instructions|prompts)[^.]*\./gi, replace: '[filtered]' },
  // "You are now a" role redefinition
  { pattern: /You\s+are\s+now\s+a[^.]*\./gi, replace: '[filtered]' },
  // Template injection: {{...}} patterns
  { pattern: /\{\{[\w_]+\}\}/g, replace: '[filtered]' },
  // Developer-mode / DAN jailbreak
  { pattern: /(developer\s*mode|DAN\s*mode|jailbreak\s*mode)/gi, replace: '[filtered]' },
  // Prompt leaking: "print your instructions"
  { pattern: /(print|reveal|show|tell)\s+(me\s+)?your\s+(system\s+)?(prompt|instructions)[^.]*\./gi, replace: '[filtered]' },
  // Role-playing injection — "act as", "pretend to be"
  { pattern: /(Act\s+as|Pretend\s+to\s+be)\s+a[^.]*\./gi, replace: '[filtered]' },
  // Context boundary injection
  { pattern: /(END\s+OF\s+CONTEXT|BEGIN\s+NEW\s+CONTEXT|SYSTEM\s+RESET)/gi, replace: '[filtered]' },
]

/**
 * Sanitize an AI user message against prompt injection attacks.
 *
 * Processes the input through multiple layers of defense:
 * 1. Jailbreak pattern neutralization (pre-HTML-strip)
 * 2. HTML/script tag removal
 * 3. Markdown sanitization (event handlers, script remnants)
 * 4. General text sanitization (control chars, trim, max length)
 * 5. Code fence injection prevention
 *
 * @param input - Raw user input string
 * @param maxLength - Maximum allowed length (default 2000)
 * @returns Sanitized string safe for LLM consumption
 */
const HARD_MAX_LENGTH = 5000

/**
 * Normalize Unicode to NFKC form to catch homoglyph-based prompt injections.
 * Characters like 'Ⅰgnore' (Roman numeral I) or Cyrillic 'а' (looks like 'a')
 * are converted to their canonical forms before pattern matching.
 */
function normalizeUnicode(input: string): string {
  return input.normalize('NFKC')
}

/**
 * Validate that a URL does not use dangerous schemes.
 */
function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase()
  return !lower.startsWith('javascript:') && !lower.startsWith('data:') && !lower.startsWith('vbscript:')
}

export function sanitizeAIMessage(input: string, maxLength = 2000): string {
  if (!input) return ''

  // Enforce an absolute hard cap as defense-in-depth (caller may pass a larger maxLength)
  const cappedInput = input.slice(0, HARD_MAX_LENGTH)
  let result = cappedInput

  // 0. Unicode normalization — converts homoglyphs to canonical form so that
  //    regex-based jailbreak patterns match even obfuscated injection attempts.
  result = normalizeUnicode(result)

  // 1. Neutralize known role-override and jailbreak patterns FIRST
  //    (must run before stripHtml so that delimiter injections like <|system|>
  //     are caught before the angle brackets get stripped as HTML)
  for (const { pattern, replace } of JAILBREAK_PATTERNS) {
    result = result.replace(pattern, replace)
  }

  // 2. Strip HTML/script tags
  result = stripHtml(result)

  // 3. Sanitize markdown (remove script/event handlers)
  result = sanitizeMarkdown(result)

  // 4. General text sanitization (control chars, trim, max length)
  result = sanitizeText(result, { maxLength: Math.min(maxLength, HARD_MAX_LENGTH) })

  // 5. Neutralize common prompt-injection delimiters
  // Replace triple-backtick fences that could be used to "break out" of system prompts
  result = result.replace(/```/g, '` ` `')

  return result
}

/**
 * Sanitize a file attachment's metadata for injection safety.
 */
export function sanitizeFileAttachment(
  file: { filename?: string; mediaType?: string; url?: string }
): { filename: string; mediaType: string; url: string } {
  return {
    filename: sanitizeAIMessage(file.filename || 'unnamed file', 255),
    mediaType: sanitizeAIMessage(file.mediaType || 'unknown', 100),
    url: file.url && isSafeUrl(file.url) ? sanitizeAIMessage(file.url, 2000) : '',
  }
}

/**
 * Batch-sanitize an array of user messages.
 */
export function sanitizeMessages(
  messages: Array<{ role: string; content: string }>,
  maxLength = 2000
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    ...msg,
    content: msg.role === 'user'
      ? sanitizeAIMessage(msg.content, maxLength)
      : msg.content, // Don't sanitize assistant responses
  }))
}

export { escapeHtml }
