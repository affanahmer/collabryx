/**
 * POST /api/activity/track/view
 *
 * Records a profile visit with 7-day deduplication.
 *
 * Flow:
 *   1. Check auth — viewer is the authenticated user
 *   2. Validate viewed_id — exists and is not self
 *   3. Check profile_visits for existing (viewer_id, viewed_id) pair
 *      a. Found & not expired → deduplicate (no-op)
 *      b. Found & expired → refresh viewed_at + expires_at
 *      c. Not found → insert new record
 *   4. Increment user_analytics counters via RPC
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

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

    const body = await request.json()

    const ActivitySchema = z.object({
      viewed_id: z.string().uuid("Invalid user ID format"),
    })

    const parsed = ActivitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'viewed_id is required' },
        { status: 400 }
      )
    }

    const viewedId = parsed.data.viewed_id

    // Cannot track self-views
    if (user.id === viewedId) {
      return NextResponse.json({ error: "Cannot track own profile view" }, { status: 400 })
    }

    // Verify the target profile exists
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", viewedId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const now = new Date()

    // ── Check existing visit ──────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("profile_visits")
      .select("id, expires_at")
      .eq("viewer_id", user.id)
      .eq("viewed_id", viewedId)
      .maybeSingle()

    if (existing) {
      const expiresAt = new Date(existing.expires_at)

      // Still within the 7-day window → deduplicate
      if (expiresAt > now) {
        return NextResponse.json({
          tracked: false,
          reason: "duplicate_within_7_days",
        })
      }

      // Expired — refresh the record (extends the window by 7 days from now)
      const { error: updateError } = await supabase
        .from("profile_visits")
        .update({
          viewed_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", existing.id)

      if (updateError) throw updateError
    } else {
      // First-ever visit from this viewer
      const { error: insertError } = await supabase
        .from("profile_visits")
        .insert({
          viewer_id: user.id,
          viewed_id: viewedId,
          viewed_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })

      if (insertError) throw insertError
    }

    // ── Bump analytics counters ───────────────────────────────────────────
    const { error: rpcError } = await supabase.rpc("increment_profile_views", {
      p_user_id: viewedId,
    })

    if (rpcError) {
      // Non-critical — log but don't fail the request
      console.error("Failed to increment profile views counter:", rpcError)
    }

    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error("Failed to track profile view:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
