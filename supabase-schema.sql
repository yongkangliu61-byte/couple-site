-- ============================================================
-- Supabase 数据库 Schema（基于 Supabase Auth + RLS）
-- 在 Supabase Dashboard → SQL Editor 中粘贴并运行
-- ============================================================

-- ============================================================
-- 账户数据表（按 user_id 隔离，user_id 来自 auth.users）
-- ============================================================
CREATE TABLE IF NOT EXISTS account_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_account_data_user ON account_data(user_id);
CREATE INDEX IF NOT EXISTS idx_account_data_user_key ON account_data(user_id, key);

-- ============================================================
-- 邀请码表
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_user ON invite_codes(user_id);

-- ============================================================
-- 共享成员表（邀请码关联后，member 可访问 owner 的数据）
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_members (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL,
  member_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_members_owner ON shared_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_members_member ON shared_members(member_id);

-- ============================================================
-- Row Level Security (RLS) — 基于 Supabase Auth
-- ============================================================
ALTER TABLE account_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_members ENABLE ROW LEVEL SECURITY;

-- account_data: 允许用户访问自己的数据，以及共享账户所有者的数据
CREATE POLICY "Users access own or shared data" ON account_data
  FOR ALL USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT owner_id FROM shared_members WHERE member_id = auth.uid()
    )
  );

-- invite_codes: 所有人可读（用于验证邀请码），所有者可管理
CREATE POLICY "Anyone can read invite codes" ON invite_codes
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert invite codes" ON invite_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete invite codes" ON invite_codes
  FOR DELETE USING (auth.uid() = user_id);

-- shared_members: 成员可读，所有者可管理
CREATE POLICY "Members read shared accounts" ON shared_members
  FOR SELECT USING (
    auth.uid() = owner_id OR auth.uid() = member_id
  );

CREATE POLICY "Anyone can insert shared members" ON shared_members
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Owner can remove members" ON shared_members
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- Storage 存储桶设置
-- ============================================================
-- 需要在 Supabase Dashboard → Storage 中手动创建:
-- 1. 创建 bucket 名为 "photo2"
--    - 勾选 "Public bucket"
--    - File size limit: 50MB
-- 2. 在 photo2 bucket → Policies 中添加:
--    - SELECT: 允许所有 (true)
--    - INSERT: 允许认证用户 (auth.role() = 'authenticated')
--    - DELETE: 允许认证用户 (auth.role() = 'authenticated')
