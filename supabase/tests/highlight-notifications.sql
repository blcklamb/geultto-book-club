-- Run against a disposable Supabase database after applying migrations.
-- Fixtures and assertions are rolled back together.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(value boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF; END $$;
INSERT INTO auth.users(id) VALUES ('a0000000-0000-4000-8000-000000000001'), ('a0000000-0000-4000-8000-000000000002'), ('a0000000-0000-4000-8000-000000000003');
INSERT INTO public.users(id, nickname, real_name, role) VALUES
 ('a0000000-0000-4000-8000-000000000001','review owner','A','member'),
 ('a0000000-0000-4000-8000-000000000002','highlight owner','B','member'),
 ('a0000000-0000-4000-8000-000000000003','comment owner','C','member');
INSERT INTO public.reviews(id, author_id, title, content_rich) VALUES ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','test','{}');
INSERT INTO public.review_highlights(id, review_id, author_id, highlight_text, start_pos, end_pos) VALUES
 ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','highlight',1,3),
 ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','own highlight',4,6);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.highlight_notifications), 'self highlight does not notify');
INSERT INTO public.highlight_comments(id, highlight_id, author_id, body, image_paths) VALUES
 ('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','',ARRAY['a0000000-0000-4000-8000-000000000003/e0000000-0000-4000-8000-000000000001.png']),
 ('d0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','own comment','{}');
INSERT INTO public.highlight_comment_replies(id, comment_id, author_id, body) VALUES
 ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','reply'),
 ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','own reply');
INSERT INTO public.highlight_reactions(id, highlight_id, user_id, emoji) VALUES
 ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','👍'),
 ('f0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','👍');
INSERT INTO public.highlight_comment_reactions(id, comment_id, user_id, emoji) VALUES
 ('f0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','❤️'),
 ('f0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','❤️');
SELECT pg_temp.assert_true((SELECT count(*) = 5 FROM public.highlight_notifications), 'exactly five eligible activities');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.highlight_notifications WHERE recipient_id = 'a0000000-0000-4000-8000-000000000001' AND kind = 'highlight'), 'review owner receives highlight');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.highlight_notifications WHERE recipient_id = 'a0000000-0000-4000-8000-000000000002' AND kind IN ('comment','highlight_reaction')), 'highlight owner receives comment and reaction');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.highlight_notifications WHERE recipient_id = 'a0000000-0000-4000-8000-000000000003' AND kind IN ('reply','comment_reaction')), 'comment owner receives reply and reaction');
SELECT pg_temp.assert_true((SELECT excerpt = '이미지' FROM public.highlight_notifications WHERE kind = 'comment'), 'image-only notification preview');
DELETE FROM public.highlight_reactions WHERE id = 'f0000000-0000-4000-8000-000000000001';
DELETE FROM public.highlight_comment_reactions WHERE id = 'f0000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_true((SELECT count(*) = 5 FROM public.highlight_notifications), 'reaction removal does not notify');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.highlight_notifications), 'recipient can only read own notifications');
-- Storage and reaction writes are tied to the authenticated, active member.
INSERT INTO storage.objects(id, bucket_id, name) VALUES (gen_random_uuid(),'content-images','a0000000-0000-4000-8000-000000000002/test.png');
DELETE FROM storage.objects WHERE bucket_id = 'content-images' AND name = 'a0000000-0000-4000-8000-000000000002/test.png';
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE name = 'a0000000-0000-4000-8000-000000000002/test.png'), 'member can remove own draft image');
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(id, bucket_id, name) VALUES (gen_random_uuid(),'content-images','a0000000-0000-4000-8000-000000000001/forged.png');
    RAISE EXCEPTION 'User was allowed to upload into another user directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.highlight_reactions(highlight_id, user_id, emoji) VALUES ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','🔥');
    RAISE EXCEPTION 'User was allowed to forge a highlight reaction';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT public.read_highlight_notifications(ARRAY[(SELECT id FROM public.highlight_notifications WHERE kind = 'comment')]);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.highlight_notifications WHERE read_at IS NOT NULL), 'individual read');
SELECT public.read_highlight_notifications(NULL, now());
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.highlight_notifications WHERE read_at IS NULL), 'read all');
DO $$ BEGIN
  BEGIN
    UPDATE public.highlight_notifications SET actor_nickname = 'forged';
    RAISE EXCEPTION 'Client was allowed to rewrite notification data';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.highlight_notifications(recipient_id, actor_nickname, kind, source_table, source_id) VALUES ('a0000000-0000-4000-8000-000000000001','fake','highlight','fake',gen_random_uuid());
    RAISE EXCEPTION 'Client was allowed to forge notification';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM public.highlight_notifications WHERE read_at IS NULL), 'read all does not affect other users');
UPDATE public.users SET is_deactivated = true WHERE id = 'a0000000-0000-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(id, bucket_id, name) VALUES (gen_random_uuid(),'content-images','a0000000-0000-4000-8000-000000000002/blocked.png');
    RAISE EXCEPTION 'Deactivated user was allowed to upload';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.highlight_notifications WHERE read_at IS NULL), 'second recipient sees offline unread notifications');
RESET ROLE;
DELETE FROM public.highlight_comments WHERE id = 'd0000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM public.highlight_notifications WHERE kind IN ('comment','reply','comment_reaction') AND comment_id IS NULL), 'deleted targets remain in history with null references');
DELETE FROM public.reviews WHERE id = 'b0000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*) = 5 FROM public.highlight_notifications WHERE review_id IS NULL AND highlight_id IS NULL), 'deleted review keeps notification history');
ROLLBACK;
