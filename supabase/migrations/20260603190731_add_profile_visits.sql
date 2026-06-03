-- ============================================================================
-- Migration: add_profile_visits
-- Description: Adds profile_visits table for 7-day deduplicated visit tracking
-- Each (viewer_id, viewed_id) pair has a 7-day expiry window:
--   - Same viewer viewing same profile within 7 days → deduplicated
--   - After 7 days, the record "expires" and a fresh visit is recorded
-- Includes an RPC to atomically increment user_analytics counters
-- ============================================================================

-- --------------------------------------------
-- TABLE: profile_visits
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(viewer_id, viewed_id),
    CHECK (viewer_id != viewed_id)
);

-- --------------------------------------------
-- INDEXES
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profile_visits_viewer_viewed 
    ON public.profile_visits(viewer_id, viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_expires_at 
    ON public.profile_visits(expires_at);
CREATE INDEX IF NOT EXISTS idx_profile_visits_viewed_id 
    ON public.profile_visits(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_viewed_id_viewer 
    ON public.profile_visits(viewed_id, viewer_id);

-- --------------------------------------------
-- TRIGGER: updated_at
-- --------------------------------------------
DROP TRIGGER IF EXISTS update_profile_visits_updated_at ON public.profile_visits;
CREATE TRIGGER update_profile_visits_updated_at
    BEFORE UPDATE ON public.profile_visits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------
-- ROW LEVEL SECURITY
-- --------------------------------------------
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- Viewer can see who they've visited
DROP POLICY IF EXISTS "Users can view profiles they visited" ON public.profile_visits;
CREATE POLICY "Users can view profiles they visited" 
    ON public.profile_visits 
    FOR SELECT 
    USING ((SELECT auth.uid()) = viewer_id);

-- The viewed user can see who visited them
DROP POLICY IF EXISTS "Users can see who viewed their profile" ON public.profile_visits;
CREATE POLICY "Users can see who viewed their profile" 
    ON public.profile_visits 
    FOR SELECT 
    USING ((SELECT auth.uid()) = viewed_id);

-- Authenticated users can record their own visits
DROP POLICY IF EXISTS "Users can record their own visits" ON public.profile_visits;
CREATE POLICY "Users can record their own visits" 
    ON public.profile_visits 
    FOR INSERT 
    WITH CHECK ((SELECT auth.uid()) = viewer_id);

-- Authenticated users can refresh their own expired visits
DROP POLICY IF EXISTS "Users can refresh their own visits" ON public.profile_visits;
CREATE POLICY "Users can refresh their own visits" 
    ON public.profile_visits 
    FOR UPDATE 
    USING ((SELECT auth.uid()) = viewer_id);

-- --------------------------------------------
-- FUNCTION: increment_profile_views
-- --------------------------------------------
-- Atomically increments user_analytics counters when a fresh profile visit occurs.
-- Uses SECURITY DEFINER to bypass RLS on user_analytics (the function caller
-- only needs to be authenticated, not own the target profile).
CREATE OR REPLACE FUNCTION public.increment_profile_views(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_analytics (
        user_id, 
        profile_views_count, 
        profile_views_last_7_days, 
        profile_views_last_30_days,
        updated_at
    )
    VALUES (p_user_id, 1, 1, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET 
        profile_views_count = user_analytics.profile_views_count + 1,
        profile_views_last_7_days = user_analytics.profile_views_last_7_days + 1,
        profile_views_last_30_days = user_analytics.profile_views_last_30_days + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO authenticated;
