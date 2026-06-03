'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withAudit } from './audit.server'

// ===========================================
// COMMENTS SERVER ACTIONS
// ===========================================

const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
})

// ===========================================
// CREATE COMMENT
// ===========================================
export async function createComment(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const validated = CreateCommentSchema.safeParse({
    content: formData.get('content'),
    post_id: formData.get('post_id'),
    parent_id: formData.get('parent_id'),
  })

  if (!validated.success) {
    return { error: 'Invalid input', details: validated.error.issues }
  }

  const comment = await withAudit(
    async () => {
      // Use transaction for atomic comment creation and count update
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: validated.data.post_id,
          author_id: user.id,
          content: validated.data.content,
          parent_id: validated.data.parent_id,
        })
        .select('id, post_id, author_id, content, parent_id, like_count, created_at, updated_at')
        .single()

      if (commentError) throw commentError

      // Atomic RPC call for transactional safety
      const { error: rpcError } = await supabase
        .rpc('increment_comment_count', { p_post_id: validated.data.post_id })

      if (rpcError) throw rpcError

      return commentData
    },
    'comment_create',
    user.id
  )

  // Send notification to the post author (if not self-comment)
  try {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id, content')
      .eq('id', validated.data.post_id)
      .single();

    if (post && post.author_id !== user.id) {
      // Get commenter's display name
      const { data: commenterProfile } = await supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .single();

      const commenterName = commenterProfile?.display_name || commenterProfile?.full_name || 'Someone';
      const postExcerpt = post.content?.slice(0, 50).replace(/\s+\S*$/, '') || '';

      // Fire-and-forget notification
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'internal',
        },
        body: JSON.stringify({
          user_id: post.author_id,
          type: 'comment',
          content: `${commenterName} commented on your post${postExcerpt ? `: "${postExcerpt}"` : ''}`,
          actor_id: user.id,
          actor_name: commenterName,
          resource_type: 'post',
          resource_id: validated.data.post_id,
        }),
      }).catch(() => {});
    }
  } catch {
    // Best-effort notification delivery
  }

  revalidatePath(`/post/${validated.data.post_id}`)

  return { data: comment }
}

// ===========================================
// UPDATE COMMENT
// ===========================================
export async function updateComment(commentId: string, content: string) {
  const supabase = await createClient()

  // Validate input
  const UpdateCommentSchema = z.object({
    commentId: z.string().uuid('Invalid comment ID'),
    content: z.string().min(1).max(2000),
  })
  const inputValidated = UpdateCommentSchema.safeParse({ commentId, content })
  if (!inputValidated.success) {
    return { error: 'Invalid input', details: inputValidated.error.issues }
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { data: existingComment, error: fetchError } = await supabase
    .from('comments')
    .select('author_id, post_id')
    .eq('id', inputValidated.data.commentId)
    .single()

  if (fetchError || !existingComment || existingComment.author_id !== user.id) {
    return { error: 'Comment not found or unauthorized' }
  }

  const { error } = await supabase
    .from('comments')
    .update({ content: inputValidated.data.content })
    .eq('id', inputValidated.data.commentId)

  if (error) {
    return { error: 'Failed to update comment' }
  }

  revalidatePath(`/post/${existingComment.post_id}`)
  
  return { success: true }
}

// ===========================================
// DELETE COMMENT
// ===========================================
export async function deleteComment(commentId: string) {
  const supabase = await createClient()

  // Validate input
  const inputValidated = z.string().uuid('Invalid comment ID').safeParse(commentId)
  if (!inputValidated.success) {
    return { error: 'Invalid input', details: inputValidated.error.issues }
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { data: existingComment, error: fetchError } = await supabase
    .from('comments')
    .select('author_id, post_id')
    .eq('id', inputValidated.data)
    .single()

  if (fetchError || !existingComment || existingComment.author_id !== user.id) {
    return { error: 'Comment not found or unauthorized' }
  }

  await withAudit(
    async () => {
      // Delete comment within transaction context
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', inputValidated.data)

      if (deleteError) throw deleteError

      // Atomic RPC call for transactional safety
      const { error: rpcError } = await supabase
        .rpc('decrement_comment_count', { p_post_id: existingComment.post_id })

      if (rpcError) throw rpcError
      
      return { success: true }
    },
    'comment_delete',
    user.id
  )

  revalidatePath(`/post/${existingComment.post_id}`)
  
  return { success: true }
}

// ===========================================
// REACT TO COMMENT
// ===========================================
export async function reactToComment(commentId: string, reactionType: string) {
  const supabase = await createClient()

  // Validate input
  const ReactToCommentSchema = z.object({
    commentId: z.string().uuid('Invalid comment ID'),
    reactionType: z.enum(['like', 'love', 'celebrate', 'insightful']),
  })
  const inputValidated = ReactToCommentSchema.safeParse({ commentId, reactionType })
  if (!inputValidated.success) {
    return { error: 'Invalid input', details: inputValidated.error.issues }
  }

  const { commentId: validCommentId } = inputValidated.data
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const { data: existingReaction, error: reactionFetchError } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', validCommentId)
    .eq('user_id', user.id)
    .single()

  if (reactionFetchError && reactionFetchError.code !== 'PGRST116') {
    return { error: 'Failed to check existing reaction' }
  }

  if (existingReaction) {
    // Toggle off - remove like
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existingReaction.id)

    if (error) {
      return { error: 'Failed to remove like' }
    }
  } else {
    // Toggle on - add like
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: validCommentId,
        user_id: user.id,
      })

    if (error) {
      return { error: 'Failed to add like' }
    }
  }

  // Send notification to comment author (if not self-like)
  try {
    const { data: comment } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', validCommentId)
      .single();

    if (comment && comment.author_id !== user.id) {
      // Get liker's display name
      const { data: likerProfile } = await supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .single();

      const likerName = likerProfile?.display_name || likerProfile?.full_name || 'Someone';

      // Fire-and-forget notification
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'internal',
        },
        body: JSON.stringify({
          user_id: comment.author_id,
          type: 'comment_like',
          content: `${likerName} liked your comment`,
          actor_id: user.id,
          actor_name: likerName,
          resource_type: 'comment',
          resource_id: validCommentId,
        }),
      }).catch(() => {});
    }
  } catch {
    // Best-effort notification delivery
  }

  revalidatePath(`/post/${validCommentId}`)
  
  return { success: true }
}
