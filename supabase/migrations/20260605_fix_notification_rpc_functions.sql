-- Migration: Fix notification RPC functions
-- Fixes send_connection and accept_connection to properly store actor_id, actor_name,
-- and use human-readable display names instead of raw UUIDs in notification content.
-- Target: Collabryx Database (Supabase)
-- Created: 2026-06-05

-- Fix send_connection: Uses display name instead of raw UUID, stores actor_id/actor_name
CREATE OR REPLACE FUNCTION public.send_connection(p_requester_id UUID, p_receiver_id UUID)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
  v_requester_name TEXT;
BEGIN
  -- Get requester display name
  SELECT COALESCE(display_name, full_name, 'Someone') INTO v_requester_name
  FROM public.profiles WHERE id = p_requester_id;

  -- Insert the pending connection request
  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (p_requester_id, p_receiver_id, 'pending')
  RETURNING id INTO v_connection_id;

  -- Atomic notification creation within the same transaction context
  INSERT INTO public.notifications (user_id, type, content, actor_id, actor_name, resource_type, resource_id)
  VALUES (p_receiver_id, 'connect', v_requester_name || ' wants to connect with you', p_requester_id, v_requester_name, 'profile', p_requester_id);

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix accept_connection: Uses display name instead of raw UUID, stores actor_id/actor_name
CREATE OR REPLACE FUNCTION public.accept_connection(p_request_id UUID, p_receiver_id UUID)
RETURNS void AS $$
DECLARE
  v_requester_id UUID;
  v_accepter_name TEXT;
BEGIN
  -- Update connection status atomically
  UPDATE public.connections 
  SET status = 'accepted'
  WHERE id = p_request_id AND receiver_id = p_receiver_id
  RETURNING requester_id INTO v_requester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found or you are not authorized to accept it';
  END IF;

  -- Get accepter display name
  SELECT COALESCE(display_name, full_name, 'Someone') INTO v_accepter_name
  FROM public.profiles WHERE id = p_receiver_id;

  -- Notify requester that their connection request was accepted
  INSERT INTO public.notifications (user_id, type, content, actor_id, actor_name, resource_type, resource_id)
  VALUES (v_requester_id, 'connect_accepted', v_accepter_name || ' accepted your connection request', p_receiver_id, v_accepter_name, 'profile', p_receiver_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
