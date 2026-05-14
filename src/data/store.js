// ============================================================
// 数据管理 - 合并 config 默认值与 localStorage 用户数据
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

export function getData(key) {
  try {
    const stored = localStorage.getItem(`couple_${key}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULTS[key];
}

export function saveData(key, data) {
  localStorage.setItem(`couple_${key}`, JSON.stringify(data));
}

export function resetData(key) {
  localStorage.removeItem(`couple_${key}`);
}

export function getAllData() {
  const result = {};
  for (const key of STORE_KEYS) {
    result[key] = getData(key);
  }
  return result;
}

export function resetAllData() {
  for (const key of STORE_KEYS) {
    resetData(key);
  }
}

export function isCustomized(key) {
  return localStorage.getItem(`couple_${key}`) !== null;
}

// Session management
export function setLoggedIn() {
  sessionStorage.setItem('couple_auth', '1');
}

export function isLoggedIn() {
  return sessionStorage.getItem('couple_auth') === '1';
}

export function logout() {
  sessionStorage.removeItem('couple_auth');
}

// Account management
export function isAccountExists() {
  return localStorage.getItem('couple_passwordHash') !== null
    || localStorage.getItem('couple_account_created') !== null;
}

export function createAccount(passwordHash) {
  localStorage.setItem('couple_passwordHash', passwordHash);
  localStorage.setItem('couple_account_created', '1');
}

// Theme management
export function getTheme() {
  try {
    const stored = localStorage.getItem('couple_theme');
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
  localStorage.setItem('couple_theme', JSON.stringify(theme));
}

export function resetTheme() {
  localStorage.removeItem('couple_theme');
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
