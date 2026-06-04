/**
 * POST /api/analytics/heartbeat
 *
 * Session heartbeat endpoint.
 * Called periodically by the client-side SessionHeartbeat component
 * to update the user's last_active timestamp and manage session counters.
 *
 * Flow:
 *   1. Authenticate the user via Supabase session
 *   2. Extract client IP from request headers
 *   3. Call record_heartbeat() RPC to update user_analytics
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract client IP from request headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || null

    // Call the record_heartbeat RPC
    const { error: rpcError } = await supabase.rpc("record_heartbeat", {
      p_user_id: user.id,
      p_ip_address: clientIp,
    })

    if (rpcError) {
      console.error("Heartbeat RPC failed:", rpcError)
      // Non-critical — don't fail the request
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Heartbeat error:", error)
    // Swallow errors — heartbeat is best-effort
    return NextResponse.json({ ok: true })
  }
}
