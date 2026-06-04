-- Migration: Add DELETE RLS policy for ai_mentor_sessions
-- Allow users to delete their own sessions, which cascades to messages

CREATE POLICY "Users can delete own AI mentor sessions" ON public.ai_mentor_sessions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
