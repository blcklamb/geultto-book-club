import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid, bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(name,'/') $$;`);
let schema = fs.readFileSync(root + "/supabase/schema.sql", "utf8");
// Foundation tables only: the actual feature migration runs unchanged below.
schema = schema.slice(
  0,
  schema.indexOf("CREATE TABLE IF NOT EXISTS public.point_transactions"),
);
await db.exec(schema);
await db.exec("GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated");
await db.exec(
  fs.readFileSync(
    root +
      "/supabase/migrations/202609070100_images_highlight_notifications.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    root +
      "/supabase/migrations/202609070101_highlight_reactions_notifications.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    root +
      "/supabase/migrations/202609070102_harden_content_image_attachments.sql",
    "utf8",
  ),
);
await db.exec(fs.readFileSync(root + "/supabase/migrations/202609070103_review_security_fixes.sql", "utf8"));
await db.exec(
  fs.readFileSync(root + "/supabase/tests/highlight-notifications.sql", "utf8"),
);
console.log(
  "PASS: migration + notification triggers, recipients, self exclusion, reaction removal, image preview, RLS, read RPC, offline history, deleted targets",
);
await db.close();
