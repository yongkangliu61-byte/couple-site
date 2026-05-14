-- ============================================================
-- Supabase 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中粘贴并运行
-- ============================================================

-- ============================================================
-- 账户数据表
-- ============================================================
CREATE TABLE IF NOT EXISTS account_data (
  id BIGSERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_name, key)
);

CREATE INDEX IF NOT EXISTS idx_account_data_name ON account_data(account_name);

-- ============================================================
-- 邀请码表
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_account ON invite_codes(account_name);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE account_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取（通过 anon key）
CREATE POLICY "Allow all read access" ON account_data FOR SELECT USING (true);
CREATE POLICY "Allow all insert access" ON account_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access" ON account_data FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access" ON account_data FOR DELETE USING (true);

CREATE POLICY "Allow all read access" ON invite_codes FOR SELECT USING (true);
CREATE POLICY "Allow all insert access" ON invite_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete access" ON invite_codes FOR DELETE USING (true);

-- ============================================================
-- Storage 存储桶设置
-- ============================================================
-- 需要在 Supabase Dashboard → Storage 中手动创建:
-- 1. 创建 bucket 名为 "photos"
--    - 勾选 "Public bucket"
--    - File size limit: 50MB
-- 2. 在 photos bucket → Policies 中添加:
--    - SELECT: 允许所有 (true)
--    - INSERT: 允许所有 (true)
--    - DELETE: 允许所有 (true)
