// ============================================================
// 数据管理 - Supabase Auth + localStorage 缓存
// ============================================================

import {
  coupleNames as defaultCoupleNames,
  startDate as defaultStartDate,
  anniversaries as defaultAnniversaries,
  timelineEvents as defaultTimelineEvents,
  galleryPhotos as defaultGalleryPhotos,
  albumMeta as defaultAlbumMeta,
  themePresets,
  defaultTheme,
} from './config';
import { generateThemeFromColor } from '../utils/helpers';

const DEFAULTS = {
  coupleNames: defaultCoupleNames,
  startDate: defaultStartDate,
  anniversaries: defaultAnniversaries,
  timelineEvents: defaultTimelineEvents,
  galleryPhotos: defaultGalleryPhotos,
  albumMeta: defaultAlbumMeta,
};

const STORE_KEYS = ['coupleNames', 'startDate', 'anniversaries', 'timelineEvents', 'galleryPhotos', 'albumMeta'];

// ============================================================
// 当前用户 + 共享账户数据所有者
// ============================================================

let currentUserId = null;
let currentUserEmail = '';
let activeDataOwner = null; // When set, data operations use this user_id (shared account owner)

export function setCurrentUser(userId, email) {
  currentUserId = userId;
  currentUserEmail = email;
  sessionStorage.setItem('couple_user_id', userId);
  sessionStorage.setItem('couple_user_email', email);
  sessionStorage.setItem('couple_auth', '1');
}

export function getCurrentUserId() {
  if (currentUserId) return currentUserId;
  currentUserId = sessionStorage.getItem('couple_user_id') || null;
  return currentUserId;
}

export function getCurrentUserEmail() {
  if (currentUserEmail) return currentUserEmail;
  currentUserEmail = sessionStorage.getItem('couple_user_email') || '';
  return currentUserEmail;
}

export function isLoggedIn() {
  return sessionStorage.getItem('couple_auth') === '1' && !!getCurrentUserId();
}

export function logout() {
  currentUserId = null;
  currentUserEmail = '';
  activeDataOwner = null;
  sessionStorage.removeItem('couple_auth');
  sessionStorage.removeItem('couple_user_id');
  sessionStorage.removeItem('couple_user_email');
  sessionStorage.removeItem('couple_active_owner');
}

// Shared account: when a user joins via invite code, they can view/edit the owner's data
export function setActiveDataOwner(ownerId) {
  activeDataOwner = ownerId;
  if (ownerId) {
    sessionStorage.setItem('couple_active_owner', ownerId);
  } else {
    sessionStorage.removeItem('couple_active_owner');
  }
}

export function getActiveDataOwner() {
  if (activeDataOwner) return activeDataOwner;
  activeDataOwner = sessionStorage.getItem('couple_active_owner') || null;
  return activeDataOwner;
}

export function getEffectiveUserId() {
  return getActiveDataOwner() || getCurrentUserId();
}

export function isViewingSharedData() {
  return !!getActiveDataOwner() && getActiveDataOwner() !== getCurrentUserId();
}

// ============================================================
// 数据存取（localStorage 缓存 + Supabase 云端）
// ============================================================

function storageKey(key) {
  const uid = getEffectiveUserId();
  return uid ? `couple_${uid}_${key}` : null;
}

export function getData(key) {
  // Try localStorage cache first
  try {
    const sk = storageKey(key);
    if (sk) {
      const stored = localStorage.getItem(sk);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return DEFAULTS[key];
}

export function saveData(key, data) {
  const sk = storageKey(key);
  if (sk) {
    localStorage.setItem(sk, JSON.stringify(data));
    // Also save to cloud
    saveDataToCloud(key, data);
  }
}

export function resetData(key) {
  const sk = storageKey(key);
  if (sk) localStorage.removeItem(sk);
}

export function resetAllData() {
  for (const key of STORE_KEYS) {
    const sk = storageKey(key);
    if (sk) localStorage.removeItem(sk);
  }
}

export function isCustomized(key) {
  const sk = storageKey(key);
  return sk ? localStorage.getItem(sk) !== null : false;
}

// ============================================================
// 云端同步（Supabase）
// ============================================================

async function saveDataToCloud(key, value) {
  const { saveData: cloudSave } = await import('./supabase');
  const uid = getEffectiveUserId();
  if (uid) cloudSave(uid, key, value);
}

export async function syncToCloud() {
  const { isCloudEnabled, saveData: cloudSave } = await import('./supabase');
  if (!isCloudEnabled()) return { success: false, message: '云端未配置' };

  const uid = getEffectiveUserId();
  if (!uid) return { success: false, message: '未登录' };

  let count = 0;
  for (const key of STORE_KEYS) {
    const data = getData(key);
    if (data !== undefined && data !== null) {
      const ok = await cloudSave(uid, key, data);
      if (ok) count++;
    }
  }
  // Also sync theme
  try {
    const stored = localStorage.getItem(storageKey('theme'));
    if (stored) {
      await cloudSave(uid, 'theme', JSON.parse(stored));
      count++;
    }
  } catch {}

  return { success: true, uploaded: count };
}

export async function syncFromCloud() {
  const { isCloudEnabled, getAllData } = await import('./supabase');
  if (!isCloudEnabled()) return { success: false, message: '云端未配置' };

  const uid = getEffectiveUserId();
  if (!uid) return { success: false, message: '未登录' };

  const cloudData = await getAllData(uid);
  if (!cloudData || Object.keys(cloudData).length === 0) {
    return { success: false, message: '云端无数据' };
  }

  let imported = 0;
  for (const [key, value] of Object.entries(cloudData)) {
    if (key === 'theme') {
      // Don't override theme via sync, handle separately
      try { localStorage.setItem(storageKey('theme'), JSON.stringify(value)); } catch {}
    } else if (STORE_KEYS.includes(key)) {
      const sk = storageKey(key);
      if (sk) {
        localStorage.setItem(sk, JSON.stringify(value));
        imported++;
      }
    }
  }

  return { success: true, imported };
}

export async function checkCloudConnection() {
  const { isCloudEnabled, getAllData } = await import('./supabase');
  if (!isCloudEnabled()) return { connected: false, message: '云端未配置' };

  const uid = getEffectiveUserId();
  if (!uid) return { connected: false, message: '未登录' };

  try {
    const data = await getAllData(uid);
    return { connected: true, hasData: Object.keys(data).length > 0 };
  } catch {
    return { connected: false, message: '连接失败' };
  }
}

// ============================================================
// 邀请码（云端优先，localStorage 备份）
// ============================================================

export async function generateInviteCode() {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const { generateInviteCode: cloudGen, getInviteCodes: cloudList, isCloudEnabled } = await import('./supabase');

  if (isCloudEnabled()) {
    // Check if already has an active code
    const existing = await cloudList(uid);
    if (existing.length > 0) return existing[0].code;
    return cloudGen(uid);
  }

  // Fallback to localStorage
  return localGenCode(uid);
}

export async function getAccountInviteCodes() {
  const uid = getCurrentUserId();
  if (!uid) return [];

  const { getInviteCodes: cloudList, isCloudEnabled } = await import('./supabase');

  if (isCloudEnabled()) {
    const list = await cloudList(uid);
    return list.map(c => ({ code: c.code, accountName: uid, createdAt: c.created_at }));
  }

  return localGetCodes().filter(c => c.accountName === uid);
}

export async function deleteInviteCode(code) {
  const { deleteInviteCode: cloudDel, isCloudEnabled } = await import('./supabase');

  if (isCloudEnabled()) {
    return cloudDel(code);
  }

  return localDelCode(code);
}

// Local fallback invite codes
function localMakeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
  return c;
}

function localGetCodes() {
  try {
    return JSON.parse(localStorage.getItem('couple_invite_codes') || '[]');
  } catch { return []; }
}

function localGenCode(uid) {
  const codes = localGetCodes();
  const existing = codes.find(c => c.accountName === uid);
  if (existing) return existing.code;
  const code = localMakeCode();
  codes.push({ code, accountName: uid, createdAt: new Date().toISOString() });
  localStorage.setItem('couple_invite_codes', JSON.stringify(codes));
  return code;
}

function localDelCode(code) {
  const codes = localGetCodes().filter(c => c.code !== code);
  localStorage.setItem('couple_invite_codes', JSON.stringify(codes));
  return true;
}

export async function useInviteCode(code) {
  const { useInviteCode: cloudUse, isCloudEnabled } = await import('./supabase');

  if (isCloudEnabled()) {
    return cloudUse(code);
  }

  // Local fallback
  const entry = localGetCodes().find(c => c.code === code.toUpperCase());
  return entry ? entry.accountName : null;
}

// ============================================================
// 共享账户
// ============================================================

export async function joinSharedAccount(code) {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const { joinSharedAccount: cloudJoin, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return null;

  const result = await cloudJoin(code, uid);
  if (result && result.ownerId && !result.error) {
    // Auto-switch to view the shared account data
    setActiveDataOwner(result.ownerId);
  }
  return result;
}

export async function getSharedAccounts() {
  const uid = getCurrentUserId();
  if (!uid) return [];

  const { getSharedAccounts: cloudList, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return [];

  return cloudList(uid);
}

export async function getSharedMembers() {
  const uid = getEffectiveUserId();
  if (!uid) return [];

  const { getSharedMembers: cloudList, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return [];

  return cloudList(uid);
}

export async function leaveSharedAccount(ownerId) {
  const uid = getCurrentUserId();
  if (!uid) return false;

  const { leaveSharedAccount: cloudLeave, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return false;

  const ok = await cloudLeave(ownerId, uid);
  if (ok && getActiveDataOwner() === ownerId) {
    setActiveDataOwner(null);
  }
  return ok;
}

export async function removeSharedMember(memberId) {
  const ownerId = getEffectiveUserId();
  if (!ownerId) return false;

  const { removeSharedMember: cloudRemove, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return false;

  return cloudRemove(ownerId, memberId);
}

// ============================================================
// 账户信息（用于登录页预览）
// ============================================================

export function getAccountInfo() {
  return {
    coupleNames: getData('coupleNames'),
    startDate: getData('startDate'),
  };
}

// ============================================================
// 主题管理
// ============================================================

export function getTheme() {
  try {
    const sk = storageKey('theme');
    if (sk) {
      const stored = localStorage.getItem(sk);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.type === 'preset' && themePresets[parsed.name]) {
          return { type: 'preset', name: parsed.name, colors: themePresets[parsed.name] };
        }
        if (parsed.type === 'custom' && parsed.colors && parsed.colors.primary) {
          return { type: 'custom', name: 'custom', colors: parsed.colors };
        }
      }
    }
  } catch {}
  return { type: 'preset', name: defaultTheme, colors: themePresets[defaultTheme] };
}

export function saveTheme(theme) {
  const sk = storageKey('theme');
  if (sk) {
    localStorage.setItem(sk, JSON.stringify(theme));
    // Sync to cloud
    const uid = getEffectiveUserId();
    if (uid) {
      import('./supabase').then(({ saveData: cloudSave }) => {
        cloudSave(uid, 'theme', theme);
      });
    }
  }
}

export function resetTheme() {
  const sk = storageKey('theme');
  if (sk) localStorage.removeItem(sk);
}

export function getThemeColors(themeName) {
  return themePresets[themeName] || themePresets[defaultTheme];
}

export { themePresets, defaultTheme, generateThemeFromColor };

// ============================================================
// 旧数据迁移
// ============================================================

export function getLegacyAccounts() {
  try {
    const stored = localStorage.getItem('couple_accounts');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function getLegacyAccountInfo(accountName) {
  const prefix = `couple_${accountName}_`;
  try {
    const names = localStorage.getItem(`${prefix}coupleNames`);
    const date = localStorage.getItem(`${prefix}startDate`);
    return {
      coupleNames: names ? JSON.parse(names) : defaultCoupleNames,
      startDate: date ? JSON.parse(date) : defaultStartDate,
    };
  } catch {
    return { coupleNames: defaultCoupleNames, startDate: defaultStartDate };
  }
}

export function getLegacyAccountData(accountName) {
  const prefix = `couple_${accountName}_`;
  const result = {};
  for (const key of STORE_KEYS) {
    try {
      const stored = localStorage.getItem(`${prefix}${key}`);
      result[key] = stored ? JSON.parse(stored) : DEFAULTS[key];
    } catch {
      result[key] = DEFAULTS[key];
    }
  }
  return result;
}

// ============================================================
// 颜色工具
// ============================================================

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function applyTheme() {
  const theme = getTheme();
  const c = theme.colors;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', c.primary);
  root.style.setProperty('--theme-primary-dark', c.primaryDark);
  root.style.setProperty('--theme-primary-darker', c.primaryDarker);
  root.style.setProperty('--theme-primary-light', c.primaryLight);
  root.style.setProperty('--theme-primary-mid', c.primaryMid);
  root.style.setProperty('--theme-primary-mid2', c.primaryMid2);
  root.style.setProperty('--theme-hero-bg', c.heroBg);
  root.style.setProperty('--theme-timeline-bg', c.timelineBg);
  root.style.setProperty('--theme-login-bg', c.loginBg);
  root.style.setProperty('--theme-timeline-line', c.timelineLine);
  root.style.setProperty('--theme-admin-header-bg', c.adminHeaderBg);
  root.style.setProperty('--theme-badge-bg', c.badgeBg);
  root.style.setProperty('--theme-progress-fill', c.progressFill);
  root.style.setProperty('--theme-album-cover-bg', c.albumCoverBg);

  const rgb = hexToRgb(c.primary);
  root.style.setProperty('--theme-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  const rgbDark = hexToRgb(c.primaryDark);
  root.style.setProperty('--theme-primary-dark-rgb', `${rgbDark.r}, ${rgbDark.g}, ${rgbDark.b}`);
}

// Auto-restore session on load
export async function initAuth() {
  const { getSession, isCloudEnabled } = await import('./supabase');
  if (!isCloudEnabled()) return false;

  const session = await getSession();
  if (session) {
    setCurrentUser(session.user.id, session.user.email);
    return true;
  }
  return false;
}

export async function cloudSignOut() {
  const { signOut } = await import('./supabase');
  await signOut();
  logout();
}
