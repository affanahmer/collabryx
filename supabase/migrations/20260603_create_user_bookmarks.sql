-- Migration: Create dedicated user_bookmarks table
-- 
-- This migration extracts bookmarks from post_reactions (where they used 🔖 emoji)
-- into a proper dedicated table with its own RLS, triggers, and counters.
--
-- Changes:
--   1. Creates user_bookmarks table (id, post_id, user_id, created_at)
--   2. Adds bookmark_count column to posts table
--   3. Creates triggers to auto-increment/decrement bookmark_count
--   4. Adds RLS policies for user_bookmarks
--   5. Updates increment_post_counter RPC to handle bookmark_count
--   6. Migrates existing 🔖 reactions from post_reactions → user_bookmarks
--   7. Cleans up orphaned 🔖 entries from post_reactions

-- ===========================================
-- 1. CREATE user_bookmarks TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- ===========================================
-- 2. ADD bookmark_count TO posts
-- ===========================================
ALTER TABLE public.posts 
    ADD COLUMN IF NOT EXISTS bookmark_count INTEGER NOT NULL DEFAULT 0;

-- ===========================================
-- 3. INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_post_id ON public.user_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_created_at ON public.user_bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_post ON public.user_bookmarks(user_id, post_id);

-- ===========================================
-- 4. FUNCTIONS for atomic bookmark count
-- ===========================================
CREATE OR REPLACE FUNCTION public.increment_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================
-- 5. TRIGGERS
-- ===========================================
DROP TRIGGER IF EXISTS increment_post_bookmark_count_trigger ON public.user_bookmarks;
CREATE TRIGGER increment_post_bookmark_count_trigger
    AFTER INSERT ON public.user_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_post_bookmark_count();

DROP TRIGGER IF EXISTS decrement_post_bookmark_count_trigger ON public.user_bookmarks;
CREATE TRIGGER decrement_post_bookmark_count_trigger
    AFTER DELETE ON public.user_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_post_bookmark_count();

-- ===========================================
-- 6. RLS POLICIES
-- ===========================================
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make migration idempotent
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;

CREATE POLICY "Users can view own bookmarks" 
    ON public.user_bookmarks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks" 
    ON public.user_bookmarks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" 
    ON public.user_bookmarks FOR DELETE 
    USING (auth.uid() = user_id);

-- ===========================================
-- 7. UPDATE increment_post_counter RPC to handle bookmark_count
-- ===========================================
CREATE OR REPLACE FUNCTION public.increment_post_counter(
  post_id UUID,
  counter_field TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  current_value INTEGER;
BEGIN
  UPDATE public.posts
  SET 
    reaction_count = CASE 
      WHEN counter_field = 'reaction_count' THEN reaction_count + increment_by 
      ELSE reaction_count 
    END,
    comment_count = CASE 
      WHEN counter_field = 'comment_count' THEN comment_count + increment_by 
      ELSE comment_count 
    END,
    share_count = CASE 
      WHEN counter_field = 'share_count' THEN share_count + increment_by 
      ELSE share_count 
    END,
    bookmark_count = CASE 
      WHEN counter_field = 'bookmark_count' THEN bookmark_count + increment_by 
      ELSE bookmark_count 
    END,
    version = version + 1,
    updated_at = NOW()
  WHERE id = post_id
  RETURNING 
    CASE 
      WHEN counter_field = 'reaction_count' THEN reaction_count
      WHEN counter_field = 'comment_count' THEN comment_count
      WHEN counter_field = 'share_count' THEN share_count
      WHEN counter_field = 'bookmark_count' THEN bookmark_count
    END INTO current_value;
  
  IF current_value IS NULL THEN
    RAISE EXCEPTION 'Post not found: %', post_id;
  END IF;
  
  RETURN current_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_post_counter(UUID, TEXT, INTEGER) TO authenticated;

-- ===========================================
-- 8. PUBLICATION (Realtime)
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bookmarks;

-- ===========================================
-- 9. GRANT PERMISSIONS
-- ===========================================
GRANT ALL ON public.user_bookmarks TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_bookmark_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_post_bookmark_count() TO authenticated;

-- ===========================================
-- 10. MIGRATE EXISTING 🔖 REACTIONS
-- Move any existing bookmark reactions from post_reactions to user_bookmarks,
-- then clean them up from post_reactions so the old emoji hack is gone.
-- ===========================================
INSERT INTO public.user_bookmarks (post_id, user_id, created_at)
SELECT post_id, user_id, created_at
FROM public.post_reactions
WHERE emoji = '🔖'
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Delete migrated bookmark entries from post_reactions
-- These reactions incorrectly counted toward reaction_count instead of bookmark_count
DELETE FROM public.post_reactions WHERE emoji = '🔖';
