'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAudit } from './audit.server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const MatchIdSchema = z.string().uuid('Invalid match ID')
const LimitSchema = z.number().int().min(1).max(100).default(20)

// ===========================================
// MATCHES SERVER ACTIONS
// ===========================================

// ===========================================
// ACCEPT MATCH
// ===========================================
export async function acceptMatch(matchId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = MatchIdSchema.safeParse(matchId)
  if (!idValidation.success) {
    return { error: 'Invalid match ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Verify match exists and belongs to user
  const { data: match, error: fetchError } = await supabase
    .from('match_suggestions')
    .select('matched_user_id')
    .eq('id', matchId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !match) {
    return { error: 'Match not found' }
  }

  // TODO(#147): Replace with supabase.rpc('accept_match', { p_match_id, p_user_id })
  // for true database-level atomicity across all 4 tables. Proposed RPC:
  //
  // CREATE OR REPLACE FUNCTION public.accept_match(p_match_id UUID, p_user_id UUID)
  // RETURNS void AS $$
  // DECLARE v_matched_user_id UUID;
  // BEGIN
  //   UPDATE match_suggestions SET status = 'connected'
  //     WHERE id = p_match_id AND user_id = p_user_id
  //     RETURNING matched_user_id INTO v_matched_user_id;
  //   IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  //   INSERT INTO connections (requester_id, receiver_id, status)
  //     VALUES (p_user_id, v_matched_user_id, 'accepted');
  //   INSERT INTO notifications (user_id, type, content)
  //     VALUES (v_matched_user_id, 'match_accepted', p_user_id || ' accepted your match suggestion');
  //   INSERT INTO match_activity (actor_user_id, target_user_id, type, activity)
  //     VALUES (p_user_id, v_matched_user_id, 'building_match', 'Connected via match suggestion');
  // END;
  // $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  await withAudit(
    async () => {
      let connectionId: string | undefined

      // 1. Update match status
      const { error: updateError } = await supabase
        .from('match_suggestions')
        .update({ status: 'connected' })
        .eq('id', matchId)

      if (updateError) throw updateError

      // 2. Create connection — rollback step 1 on failure
      const { data: connectionData, error: connectionError } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          receiver_id: match.matched_user_id,
          status: 'accepted',
        })
        .select('id')
        .single()

      if (connectionError) {
        await supabase
          .from('match_suggestions')
          .update({ status: 'active' })
          .eq('id', matchId)
        throw connectionError
      }
      connectionId = connectionData.id

      // 3. Create notification — rollback steps 1+2 on failure
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: match.matched_user_id,
          type: 'match_accepted',
          content: `${user.id} accepted your match suggestion`,
        })

      if (notifError) {
        // Rollback steps 1+2 (connection + match status)
        const rbC = await supabase
          .from('connections').delete().eq('id', connectionId)
        const rbM = await supabase
          .from('match_suggestions').update({ status: 'active' }).eq('id', matchId)
        if (rbC.error || rbM.error) {
          logger.db.error('acceptMatch rollback failed — orphaned rows', {
            connectionId, matchId, rbC: rbC.error?.message, rbM: rbM.error?.message,
          })
        }
        throw notifError
      }

      // 4. Record match activity — rollback steps 1+2+3 on failure
      const { error: activityError } = await supabase
        .from('match_activity')
        .insert({
          actor_user_id: user.id,
          target_user_id: match.matched_user_id,
          type: 'building_match',
          activity: 'Connected via match suggestion',
        })

      if (activityError) {
        // Rollback steps 1+2+3 (step 4 failed, nothing inserted there)
        const rbN = await supabase
          .from('notifications').delete().eq('user_id', match.matched_user_id)
            .eq('type', 'match_accepted')
        const rbC = await supabase
          .from('connections').delete().eq('id', connectionId)
        const rbM = await supabase
          .from('match_suggestions').update({ status: 'active' }).eq('id', matchId)
        if (rbN.error || rbC.error || rbM.error) {
          logger.db.error('acceptMatch rollback failed — orphaned rows', {
            connectionId, matchId,
            rbN: rbN.error?.message, rbC: rbC.error?.message, rbM: rbM.error?.message,
          })
        }
        throw activityError
      }
      
      return { success: true }
    },
    'match_accept',
    user.id
  )

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  
  return { success: true }
}

// ===========================================
// DISMISS MATCH
// ===========================================
export async function dismissMatch(matchId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = MatchIdSchema.safeParse(matchId)
  if (!idValidation.success) {
    return { error: 'Invalid match ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('match_suggestions')
    .update({ status: 'dismissed' })
    .eq('id', matchId)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Failed to dismiss match' }
  }

  revalidatePath('/matches')
  
  return { success: true }
}

// ===========================================
// UPDATE MATCH PREFERENCES
// ===========================================

const MatchPreferencesSchema = z.object({
  min_match_percentage: z.number().int().min(0).max(100).optional(),
  interested_in_types: z.array(z.string()).optional(),
  availability_match: z.enum(['any', 'similar', 'complementary']).optional(),
})

export async function updateMatchPreferences(preferences: {
  min_match_percentage?: number
  interested_in_types?: string[]
  availability_match?: 'any' | 'similar' | 'complementary'
}) {
  const supabase = await createClient()
  
  // Zod validation
  const validation = MatchPreferencesSchema.safeParse(preferences)
  if (!validation.success) {
    return { error: 'Invalid match preferences' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('match_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return { error: 'Failed to update preferences' }
  }

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  
  return { success: true }
}

// ===========================================
// GET MATCH SUGGESTIONS
// ===========================================
export async function getMatchSuggestions(limit = 20) {
  const supabase = await createClient()
  
  // Zod validation
  const limitValidation = LimitSchema.safeParse(limit)
  if (!limitValidation.success) {
    return { error: 'Invalid limit parameter' }
  }
  const validLimit = limitValidation.data

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('match_suggestions')
    .select(`
      id,
      user_id,
      matched_user_id,
      match_percentage,
      reasons,
      ai_confidence,
      ai_explanation,
      status,
      created_at,
      expires_at,
      matched_user:profiles!inner (
        id,
        display_name,
        full_name,
        avatar_url,
        headline
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('match_percentage', { ascending: false })
    .limit(validLimit)

  if (error) {
    return { error: 'Failed to fetch matches' }
  }

  return { data }
}
