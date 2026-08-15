-- Migration v8: Enable single-user direct Supabase access via anon key with RLS policies
-- Run this in your Supabase SQL editor if you want the Flutter client app to connect directly to Supabase.

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon key full CRUD access for personal/single-user database instances
DROP POLICY IF EXISTS "Allow anon access on books" ON books;
CREATE POLICY "Allow anon access on books"
  ON books FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access on reading_log" ON reading_log;
CREATE POLICY "Allow anon access on reading_log"
  ON reading_log FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access on app_settings" ON app_settings;
CREATE POLICY "Allow anon access on app_settings"
  ON app_settings FOR ALL TO anon
  USING (true) WITH CHECK (true);
