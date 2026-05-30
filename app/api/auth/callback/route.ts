import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { devLog, isDebugEnabled } from "@/lib/services/development"

/**
 * CSRF Protection Note:
 * This endpoint uses GET for the OAuth callback flow (standard PKCE flow).
 * Supabase manages CSRF protection via the `SameSite=Strict` cookie attribute set
 * on the auth session cookie. This prevents the browser from sending the cookie
 * on cross-site requests, effectively mitigating CSRF attacks on the auth callback.
 * No additional CSRF token validation is required for this callback route.
 */

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    let next = searchParams.get("next") ?? "/dashboard"
    function isValidRedirect(path: string): boolean {
        if (!path.startsWith('/')) return false
        if (path.startsWith('//')) return false
        if (path.includes('@')) return false
        if (path.includes(':')) return false
        return true
    }
    if (!isValidRedirect(next)) {
        next = '/dashboard'
    }

    const timestamp = new Date().toISOString()
    const isDebug = isDebugEnabled()

    // State validation for OAuth callback security (#31)
    // The state cookie should be set by the login route before initiating OAuth
    const state = searchParams.get("state")
    const cookieStore = await cookies()
    const storedState = cookieStore.get("oauth_state")?.value
    if (storedState && state !== storedState) {
      if (isDebug) {
        devLog("auth", "❌ OAuth state mismatch", {
          hasState: !!state,
          hasStoredState: !!storedState,
          timestamp,
        })
      }
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("invalid_state")}`)
    }

    if (isDebug) {
        devLog("auth", "=== AUTH CALLBACK RECEIVED ===", {
            url: request.url,
            hasCode: !!code,
            nextParam: next,
            timestamp,
        })
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error) {
            // Get user info to check email verification status
            const { data: { user } } = await supabase.auth.getUser()
            
            if (isDebug) {
                devLog("auth", "✅ Auth callback successful - session exchanged", {
                    userId: user?.id,
                    email: user?.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
                    emailConfirmedAt: user?.email_confirmed_at,
                    isEmailVerified: !!user?.email_confirmed_at,
                    redirecting_to: next,
                    timestamp,
                })
            }
            
            // Log email verification status for debugging
            if (user && isDebug) {
                const verificationStatus = user.email_confirmed_at ? "VERIFIED" : "NOT_VERIFIED"
                devLog("auth", `📧 Email verification status: ${verificationStatus}`, {
                    email: user.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
                    confirmedAt: user.email_confirmed_at,
                    willRedirectTo: next,
                })
            }
            
            const forwardedHost = request.headers.get("x-forwarded-host")
            const isLocalEnv = process.env.NODE_ENV === "development"
            
            if (isDebug) {
                devLog("auth", "🚀 Executing redirect", {
                    isLocalEnv,
                    hasForwardedHost: !!forwardedHost,
                    destination: `${origin}${next}`,
                })
            }
            
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        } else {
            // Log error with full details for debugging
            if (isDebug) {
                devLog("auth", "❌ Auth callback error - exchangeCodeForSession failed", {
                    error_message: error.message,
                    error_status: error.status,
                    error_code: error.code,
                    timestamp,
                    url: request.url,
                    next: next,
                })
            }
            

            
            // Sanitize and wrap error in encodeURIComponent before forwarding (#30)
            const sanitizedError = encodeURIComponent("authentication_failed")
            return NextResponse.redirect(
                `${origin}/login?error=${sanitizedError}`
            )
        }
    }

    // Missing code parameter - log the issue
    if (isDebug) {
        devLog("auth", "❌ Auth callback missing code parameter", {
            url: request.url,
            searchParams: Object.fromEntries(searchParams),
            timestamp,
        })
    }
    
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("auth_callback_error")}`)
}
