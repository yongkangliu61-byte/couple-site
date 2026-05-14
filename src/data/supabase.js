// ============================================================
// Supabase 云端数据层（基于 Supabase Auth 的安全认证）
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

export function isCloudEnabled() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project.supabase.co');
}

export function getClient() {
  if (!supabase && isCloudEnabled()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'X-Client-Info': 'couple-site' },
      },
    });
  }
  return supabase;
}

// ============================================================
// 认证操作
// ============================================================

export async function signUp(email, password, coupleNames, startDate) {
  const client = getClient();
  if (!client) return { error: '云端未配置' };

  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    const msg = error.message.includes('already')
      ? '该邮箱已注册，请直接登录'
      : error.message;
    return { error: msg };
  }

  const userId = data.user?.id;
  if (!userId) return { error: '注册失败，请重试' };

  // 保存初始数据
  const saved = await saveUserData(userId, {
    coupleNames,
    startDate,
    registeredAt: new Date().toISOString(),
  });

  return saved
    ? { success: true, userId, session: data.session }
    : { success: true, userId, session: data.session, warning: '数据保存失败，但不影响登录' };
}

export async function signIn(email, password) {
  const client = getClient();
  if (!client) return { error: '云端未配置' };

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login')) {
      return { error: '邮箱或密码错误' };
    }
    return { error: error.message };
  }

  return { success: true, userId: data.user.id, session: data.session };
}

export async function signOut() {
  const client = getClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function resetPassword(email) {
  const client = getClient();
  if (!client) return { error: '云端未配置' };

  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin + '/login',
  });

  return error ? { error: error.message } : { success: true };
}

export async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.getSession();
  return data.session;
}

export async function getCurrentUserId() {
  const session = await getSession();
  return session?.user?.id || null;
}

// ============================================================
// 数据操作（按 user_id 隔离，受 RLS 保护）
// ============================================================

async function saveUserData(userId, dataObj) {
  const client = getClient();
  if (!client || !userId) return false;

  const rows = Object.entries(dataObj).map(([key, value]) => ({
    user_id: userId,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from('account_data')
    .upsert(rows, { onConflict: 'user_id, key' });

  return !error;
}

export async function saveData(userId, key, value) {
  const client = getClient();
  if (!client || !userId) return false;

  const { error } = await client
    .from('account_data')
    .upsert({
      user_id: userId,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, key' });

  return !error;
}

export async function getData(userId, key) {
  const client = getClient();
  if (!client || !userId) return null;

  const { data, error } = await client
    .from('account_data')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value;
}

export async function getAllData(userId) {
  const client = getClient();
  if (!client || !userId) return {};

  const { data, error } = await client
    .from('account_data')
    .select('key, value')
    .eq('user_id', userId);

  if (error) return {};
  const result = {};
  for (const row of data) {
    result[row.key] = row.value;
  }
  return result;
}

// ============================================================
// 文件上传
// ============================================================

export async function uploadFile(userId, fileName, base64Data) {
  const client = getClient();
  if (!client || !userId) return null;

  try {
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const ext = base64Data.split(';')[0].split('/')[1] || 'jpg';
    const filePath = `${userId}/${fileName || Date.now()}.${ext}`;

    const { error } = await client.storage
      .from('photo2')
      .upload(filePath, blob, { upsert: true, contentType: blob.type });

    if (error) return null;

    const { data: urlData } = client.storage
      .from('photo2')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function deleteFile(userId, filePath) {
  const client = getClient();
  if (!client || !userId) return false;

  let path = filePath;
  if (filePath.includes('supabase.co')) {
    const parts = filePath.split('/storage/v1/object/public/photo2/');
    if (parts[1]) path = parts[1];
  }

  const { error } = await client.storage.from('photo2').remove([path]);
  return !error;
}

// ============================================================
// 邀请码
// ============================================================

export async function generateInviteCode(userId) {
  const client = getClient();
  if (!client || !userId) return null;

  const code = makeCode();
  const { error } = await client
    .from('invite_codes')
    .insert({ code, user_id: userId, account_name: userId, created_at: new Date().toISOString() });

  if (error) return null;
  return code;
}

export async function useInviteCode(code) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('invite_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return data.user_id;
}

// ============================================================
// 共享账户
// ============================================================

export async function joinSharedAccount(code, memberUserId) {
  const client = getClient();
  if (!client || !memberUserId) return null;

  // Look up the invite code to find the owner
  const ownerId = await useInviteCode(code);
  if (!ownerId) return null;

  // Don't allow joining your own account
  if (ownerId === memberUserId) return { error: '不能加入自己的账户' };

  // Check if already a member
  const { data: existing } = await client
    .from('shared_members')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('member_id', memberUserId)
    .maybeSingle();

  if (existing) return { ownerId, alreadyMember: true };

  // Insert shared_members record
  const { error } = await client
    .from('shared_members')
    .insert({
      owner_id: ownerId,
      member_id: memberUserId,
      created_at: new Date().toISOString(),
    });

  if (error) return null;
  return { ownerId, alreadyMember: false };
}

export async function getSharedAccounts(memberUserId) {
  const client = getClient();
  if (!client || !memberUserId) return [];

  const { data, error } = await client
    .from('shared_members')
    .select('owner_id, created_at')
    .eq('member_id', memberUserId);

  if (error || !data) return [];
  return data;
}

export async function getSharedMembers(ownerUserId) {
  const client = getClient();
  if (!client || !ownerUserId) return [];

  const { data, error } = await client
    .from('shared_members')
    .select('member_id, created_at')
    .eq('owner_id', ownerUserId);

  if (error || !data) return [];
  return data;
}

export async function removeSharedMember(ownerUserId, memberUserId) {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('shared_members')
    .delete()
    .eq('owner_id', ownerUserId)
    .eq('member_id', memberUserId);

  return !error;
}

export async function leaveSharedAccount(ownerUserId, memberUserId) {
  return removeSharedMember(ownerUserId, memberUserId);
}

export async function getInviteCodes(userId) {
  const client = getClient();
  if (!client || !userId) return [];

  const { data } = await client
    .from('invite_codes')
    .select('code, created_at')
    .eq('user_id', userId);

  return data || [];
}

export async function deleteInviteCode(code) {
  const client = getClient();
  if (!client) return false;

  const { error } = await client.from('invite_codes').delete().eq('code', code);
  return !error;
}

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
