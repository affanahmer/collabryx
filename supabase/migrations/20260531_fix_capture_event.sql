-- Fix the capture_event() function that crashes on comments/post_reactions inserts
-- Bug: It used COALESCE(NEW.user_id, NEW.author_id, ...) but PostgreSQL evaluates
-- ALL COALESCE arguments, and accessing a non-existent NEW field throws:
--   "record \"new\" has no field \"user_id\"" (on comments table)
--   "record \"new\" has no field \"author_id\"" (on post_reactions table)

CREATE OR REPLACE FUNCTION capture_event()
RETURNS trigger AS $$
DECLARE
  event_type_param text;
  target_id_val uuid;
  target_type_val text;
  metadata_val jsonb;
  actor_id_val uuid;
BEGIN
  event_type_param := TG_ARGV[0];

  CASE TG_TABLE_NAME
    WHEN 'post_reactions' THEN
      target_id_val := NEW.post_id;
      target_type_val := 'post';
      metadata_val := jsonb_build_object('post_id', NEW.post_id);
      actor_id_val := NEW.user_id;
    WHEN 'comments' THEN
      target_id_val := NEW.post_id;
      target_type_val := 'post';
      metadata_val := jsonb_build_object('post_id', NEW.post_id);
      actor_id_val := NEW.author_id;
    WHEN 'connections' THEN
      target_id_val := NEW.receiver_id;
      target_type_val := 'profile';
      metadata_val := jsonb_build_object('status', NEW.status);
      actor_id_val := NEW.requester_id;
    WHEN 'messages' THEN
      target_id_val := NEW.conversation_id;
      target_type_val := 'conversation';
      metadata_val := jsonb_build_object('conversation_id', NEW.conversation_id);
      actor_id_val := NEW.sender_id;
    WHEN 'match_activity' THEN
      target_id_val := NEW.target_user_id;
      target_type_val := 'profile';
      metadata_val := jsonb_build_object('type', NEW.type);
      actor_id_val := NEW.actor_user_id;
    WHEN 'profiles' THEN
      target_id_val := NEW.id;
      target_type_val := 'profile';
      metadata_val := '{}'::jsonb;
      actor_id_val := NEW.id;
    ELSE
      target_id_val := NULL;
      target_type_val := 'unknown';
      metadata_val := '{}'::jsonb;
      actor_id_val := NULL;
  END CASE;

  INSERT INTO events (event_type, actor_id, target_id, target_type, metadata)
  VALUES (event_type_param, actor_id_val, target_id_val, target_type_val, metadata_val);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
