// ============================================================
// 数据管理 - 多账户支持 + config 默认值合并
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
// 账户注册表
// ============================================================

export function getAccounts() {
  try {
    const stored = localStorage.getItem('couple_accounts');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveAccounts(list) {
  localStorage.setItem('couple_accounts', JSON.stringify(list));
}

// ============================================================
// 当前账户
// ============================================================

export function getCurrentAccount() {
  return sessionStorage.getItem('couple_current_account') || '';
}

export function loginToAccount(accountName) {
  sessionStorage.setItem('couple_current_account', accountName);
  sessionStorage.setItem('couple_auth', '1');
}

export function isLoggedIn() {
  return sessionStorage.getItem('couple_auth') === '1' && !!getCurrentAccount();
}

export function logout() {
  sessionStorage.removeItem('couple_auth');
  sessionStorage.removeItem('couple_current_account');
}

// ============================================================
// 账户认证
// ============================================================

export function isAccountExists() {
  return getAccounts().length > 0;
}

export function getAccountAuth(accountName) {
  try {
    const stored = localStorage.getItem(`couple_${accountName}_auth`);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveAccountAuth(accountName, data) {
  localStorage.setItem(`couple_${accountName}_auth`, JSON.stringify(data));
}

export function verifyPassword(accountName, passwordHash) {
  const auth = getAccountAuth(accountName);
  return auth && auth.passwordHash === passwordHash;
}

export function updatePassword(passwordHash) {
  const account = getCurrentAccount();
  if (!account) return;
  saveAccountAuth(account, { passwordHash });
}

// ============================================================
// 创建账户
// ============================================================

export function createNewAccount(accountName, passwordHash, coupleNames, startDate) {
  const accounts = getAccounts();
  if (accounts.includes(accountName)) return false;
  saveAccountAuth(accountName, { passwordHash });
  const accKey = accountName;
  localStorage.setItem(`couple_${accKey}_coupleNames`, JSON.stringify(coupleNames));
  localStorage.setItem(`couple_${accKey}_startDate`, JSON.stringify(startDate));
  accounts.push(accountName);
  saveAccounts(accounts);
  loginToAccount(accountName);
  return true;
}

// ============================================================
// 数据存取（按当前账户隔离）
// ============================================================

function storageKey(key) {
  const account = getCurrentAccount();
  return account ? `couple_${account}_${key}` : `couple_${key}`;
}

export function getData(key) {
  try {
    const stored = localStorage.getItem(storageKey(key));
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULTS[key];
}

export function saveData(key, data) {
  localStorage.setItem(storageKey(key), JSON.stringify(data));
}

export function resetData(key) {
  localStorage.removeItem(storageKey(key));
}

export function resetAllData() {
  for (const key of STORE_KEYS) {
    resetData(key);
  }
}

export function isCustomized(key) {
  return localStorage.getItem(storageKey(key)) !== null;
}

// ============================================================
// 账户信息（用于登录页预览）
// ============================================================

export function getAccountInfo(accountName) {
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

// ============================================================
// 旧数据迁移
// ============================================================

export function tryMigrateOldData() {
  const accounts = getAccounts();
  if (accounts.length > 0) return;
  const oldHash = localStorage.getItem('couple_passwordHash');
  const oldCreated = localStorage.getItem('couple_account_created');
  if (!oldHash && !oldCreated) return;
  const accountName = 'default';
  saveAccountAuth(accountName, { passwordHash: oldHash || '' });
  const oldKeys = {
    coupleNames: localStorage.getItem('couple_coupleNames'),
    startDate: localStorage.getItem('couple_startDate'),
    anniversaries: localStorage.getItem('couple_anniversaries'),
    timelineEvents: localStorage.getItem('couple_timelineEvents'),
    galleryPhotos: localStorage.getItem('couple_galleryPhotos'),
    albumMeta: localStorage.getItem('couple_albumMeta'),
    theme: localStorage.getItem('couple_theme'),
  };
  for (const [key, val] of Object.entries(oldKeys)) {
    if (val) {
      try {
        localStorage.setItem(`couple_${accountName}_${key}`, val);
      } catch {}
    }
  }
  localStorage.removeItem('couple_passwordHash');
  localStorage.removeItem('couple_account_created');
  for (const key of STORE_KEYS) {
    localStorage.removeItem(`couple_${key}`);
  }
  localStorage.removeItem('couple_theme');
  saveAccounts([accountName]);
}

// ============================================================
// 主题管理（按账户隔离）
// ============================================================

export function getTheme() {
  try {
    const stored = localStorage.getItem(storageKey('theme'));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.type === 'preset' && themePresets[parsed.name]) {
        return { type: 'preset', name: parsed.name, colors: themePresets[parsed.name] };
      }
      if (parsed.type === 'custom' && parsed.colors && parsed.colors.primary) {
        return { type: 'custom', name: 'custom', colors: parsed.colors };
      }
    }
  } catch {}
  return { type: 'preset', name: defaultTheme, colors: themePresets[defaultTheme] };
}

export function saveTheme(theme) {
  localStorage.setItem(storageKey('theme'), JSON.stringify(theme));
}

export function resetTheme() {
  localStorage.removeItem(storageKey('theme'));
}

export function getThemeColors(themeName) {
  return themePresets[themeName] || themePresets[defaultTheme];
}

export { themePresets, defaultTheme, generateThemeFromColor };

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
