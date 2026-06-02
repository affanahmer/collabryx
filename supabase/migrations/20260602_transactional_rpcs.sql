-- Migration: Transactional RPC Functions for Collabryx
-- Target: Collabryx Database (Supabase)
-- Created: 2026-06-02

-- 1. Atomic Comment Count Incrementor/Decrementor
CREATE OR REPLACE FUNCTION public.increment_comment_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET comment_count = comment_count + 1 
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_comment_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET comment_count = GREATEST(comment_count - 1, 0) 
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. Atomic Connection Requester
CREATE OR REPLACE FUNCTION public.send_connection(p_requester_id UUID, p_receiver_id UUID)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  -- Insert the pending connection request
  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (p_requester_id, p_receiver_id, 'pending')
  RETURNING id INTO v_connection_id;

  -- Atomic notification creation within the same transaction context
  INSERT INTO public.notifications (user_id, type, content, resource_id)
  VALUES (p_receiver_id, 'connect', p_requester_id || ' wants to connect with you', v_connection_id);

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. Atomic Connection Approver
CREATE OR REPLACE FUNCTION public.accept_connection(p_request_id UUID, p_receiver_id UUID)
RETURNS void AS $$
DECLARE
  v_requester_id UUID;
BEGIN
  -- Update connection status atomically
  UPDATE public.connections 
  SET status = 'accepted'
  WHERE id = p_request_id AND receiver_id = p_receiver_id
  RETURNING requester_id INTO v_requester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found or you are not authorized to accept it';
  END IF;

  -- Create notification within the same transaction context
  INSERT INTO public.notifications (user_id, type, content, resource_id)
  VALUES (v_requester_id, 'connect', p_receiver_id || ' accepted your connection request', p_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. Atomic Match Connector
CREATE OR REPLACE FUNCTION public.connect_with_match(p_user_id UUID, p_matched_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Create pending connection request
  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (p_user_id, p_matched_user_id, 'pending');

  -- Update match status to connected atomically
  UPDATE public.match_suggestions 
  SET status = 'connected'
  WHERE user_id = p_user_id AND matched_user_id = p_matched_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. Atomic Match Approver
CREATE OR REPLACE FUNCTION public.accept_match(p_match_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_matched_user_id UUID;
BEGIN
  -- Update match suggestion status to connected
  UPDATE public.match_suggestions 
  SET status = 'connected'
  WHERE id = p_match_id AND user_id = p_user_id
  RETURNING matched_user_id INTO v_matched_user_id;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Match suggestion not found'; 
  END IF;

  -- Insert accepted connection atomically
  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (p_user_id, v_matched_user_id, 'accepted');

  -- Send notification atomically
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (v_matched_user_id, 'match_accepted', p_user_id || ' accepted your match suggestion');

  -- Write match activity atomically
  INSERT INTO public.match_activity (actor_user_id, target_user_id, type, activity)
  VALUES (p_user_id, v_matched_user_id, 'building_match', 'Connected via match suggestion');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
