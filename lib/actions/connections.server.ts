'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAudit } from './audit.server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const UserIdSchema = z.string().uuid('Invalid user ID')
const RequestIdSchema = z.string().uuid('Invalid request ID')

// ===========================================
// CONNECTIONS SERVER ACTIONS
// ===========================================

// ===========================================
// SEND CONNECTION REQUEST
// ===========================================
export async function sendConnectionRequest(targetUserId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = UserIdSchema.safeParse(targetUserId)
  if (!idValidation.success) {
    return { error: 'Invalid target user ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  if (targetUserId === user.id) {
    return { error: 'Cannot send request to yourself' }
  }

  // Check if already connected or request exists (parameterized via .in() to avoid SQL injection)
  const { data: existing, error: existingError } = await supabase
    .from('connections')
    .select('id, status')
    .in('requester_id', [user.id, targetUserId])
    .in('receiver_id', [user.id, targetUserId])
    .maybeSingle()

  if (existingError) {
    return { error: 'Failed to check existing connection' }
  }

  if (existing) {
    return { error: 'Connection already exists or request pending' }
  }

  const { data: request, error } = await withAudit(
    async () => {
      // Insert connection request
      const { data, error: insertError } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          receiver_id: targetUserId,
          status: 'pending',
        })
        .select('id, requester_id, receiver_id, status, created_at')
        .single()

      if (insertError) throw insertError

      // TODO(#147): Replace manual rollback with supabase.rpc('send_connection', { p_requester_id, p_receiver_id })
      // for true database-level atomicity. The manual rollback below can also fail, leaving orphaned rows.
      // Proposed RPC:
      //
      // CREATE OR REPLACE FUNCTION public.send_connection(p_requester_id UUID, p_receiver_id UUID)
      // RETURNS uuid AS $$
      // DECLARE v_connection_id UUID;
      // BEGIN
      //   INSERT INTO connections (requester_id, receiver_id, status)
      //     VALUES (p_requester_id, p_receiver_id, 'pending')
      //     RETURNING id INTO v_connection_id;
      //   INSERT INTO notifications (user_id, type, content, resource_id)
      //     VALUES (p_receiver_id, 'connect', p_requester_id || ' wants to connect with you', v_connection_id);
      //   RETURN v_connection_id;
      // END;
      // $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

      // Create notification for the recipient (within same transaction context)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'connect',
          content: `${user.id} wants to connect with you`,
          resource_id: data.id,
        })
      
      if (notifError) {
        // Rollback: delete the connection request if notification fails.
        // NOTE: This rollback can also fail, leaving an orphaned row.
        const { error: rbError } = await supabase
          .from('connections').delete().eq('id', data.id)
        if (rbError) {
          logger.db.error('sendConnection rollback failed — orphaned connection', {
            connectionId: data.id, rollbackError: rbError.message,
          })
        }
        throw notifError
      }
      
      return data
    },
    'connection_request_send',
    user.id
  )

  if (error) {
    logger.db.error('Failed to send connection request:', error)
    return { error: 'Failed to send connection request' }
  }

  revalidatePath('/requests')
  revalidatePath(`/profile/${targetUserId}`)
  
  return { data: request }
}

// ===========================================
// ACCEPT CONNECTION REQUEST
// ===========================================
export async function acceptConnectionRequest(requestId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = RequestIdSchema.safeParse(requestId)
  if (!idValidation.success) {
    return { error: 'Invalid request ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { data: request, error: fetchError } = await supabase
    .from('connections')
    .select('requester_id, receiver_id')
    .eq('id', requestId)
    .eq('receiver_id', user.id)
    .single()

  if (fetchError || !request) {
    return { error: 'Request not found' }
  }

  await withAudit(
    async () => {
      // Update connection status
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (updateError) throw updateError

      // TODO(#147): Replace manual rollback with supabase.rpc('accept_connection', { p_request_id, p_receiver_id })
      // for true database-level atomicity. The manual rollback below can also fail.
      // Proposed RPC:
      //
      // CREATE OR REPLACE FUNCTION public.accept_connection(p_request_id UUID, p_receiver_id UUID)
      // RETURNS void AS $$
      // DECLARE v_requester_id UUID;
      // BEGIN
      //   UPDATE connections SET status = 'accepted'
      //     WHERE id = p_request_id AND receiver_id = p_receiver_id
      //     RETURNING requester_id INTO v_requester_id;
      //   IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
      //   INSERT INTO notifications (user_id, type, content, resource_id)
      //     VALUES (v_requester_id, 'connect', p_receiver_id || ' accepted your connection request', p_request_id);
      // END;
      // $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

      // Create notification for the sender (with rollback on failure)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: request.requester_id,
          type: 'connect',
          content: `${user.id} accepted your connection request`,
          resource_id: requestId,
        })
      
      if (notifError) {
        // Rollback: revert connection status if notification fails.
        // NOTE: This rollback can also fail, leaving inconsistent state.
        const { error: rbError } = await supabase
          .from('connections').update({ status: 'pending' }).eq('id', requestId)
        if (rbError) {
          logger.db.error('acceptConnection rollback failed — inconsistent connection status', {
            requestId, rollbackError: rbError.message,
          })
        }
        throw notifError
      }
      
      return { success: true }
    },
    'connection_request_accept',
    user.id
  )

  revalidatePath('/requests')
  revalidatePath('/dashboard')
  
  return { success: true }
}

// ===========================================
// DECLINE CONNECTION REQUEST
// ===========================================
export async function declineConnectionRequest(requestId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = RequestIdSchema.safeParse(requestId)
  if (!idValidation.success) {
    return { error: 'Invalid request ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', requestId)
    .eq('receiver_id', user.id)

  if (error) {
    return { error: 'Failed to decline request' }
  }

  revalidatePath('/requests')
  
  return { success: true }
}

// ===========================================
// REMOVE CONNECTION
// ===========================================
export async function removeConnection(userId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = UserIdSchema.safeParse(userId)
  if (!idValidation.success) {
    return { error: 'Invalid user ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Delete any connection between these two users in either direction (parameterized via .in())
  const { error } = await supabase
    .from('connections')
    .delete()
    .in('requester_id', [user.id, userId])
    .in('receiver_id', [user.id, userId])

  if (error) {
    return { error: 'Failed to remove connection' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/profile/${userId}`)
  
  return { success: true }
}

// ===========================================
// CANCEL CONNECTION REQUEST
// ===========================================
export async function cancelConnectionRequest(requestId: string) {
  const supabase = await createClient()
  
  // Zod validation
  const idValidation = RequestIdSchema.safeParse(requestId)
  if (!idValidation.success) {
    return { error: 'Invalid request ID' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', requestId)
    .eq('requester_id', user.id)

  if (error) {
    return { error: 'Failed to cancel request' }
  }

  revalidatePath('/requests')
  
  return { success: true }
}
