export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function createThumbnail(base64, maxSize = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToHSL(hex) {
  let r, g, b;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16) / 255;
    g = parseInt(h[1] + h[1], 16) / 255;
    b = parseInt(h[2] + h[2], 16) / 255;
  } else {
    r = parseInt(h.substring(0, 2), 16) / 255;
    g = parseInt(h.substring(2, 4), 16) / 255;
    b = parseInt(h.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat, lig = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  } else {
    sat = 0;
  }
  return { h: Math.round(hue * 360), s: Math.round(sat * 100), l: Math.round(lig * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)) * 255);
  };
  return `#${f(0).toString(16).padStart(2, '0')}${f(8).toString(16).padStart(2, '0')}${f(4).toString(16).padStart(2, '0')}`;
}

export function generateThemeFromColor(hex) {
  const hsl = hexToHSL(hex);
  const primary = hex;
  const primaryDark = hslToHex(hsl.h, hsl.s, Math.max(5, hsl.l - 12));
  const primaryDarker = hslToHex(hsl.h, hsl.s, Math.max(3, hsl.l - 22));
  const primaryLight = hslToHex(hsl.h, Math.max(5, hsl.s - 15), Math.min(97, hsl.l + 32));
  const primaryMid = hslToHex(hsl.h, Math.max(5, hsl.s - 10), Math.min(95, hsl.l + 20));
  const primaryMid2 = hslToHex(hsl.h, Math.max(5, hsl.s - 5), Math.min(90, hsl.l + 10));
  const heroGradientEnd = hslToHex(hsl.h, hsl.s, Math.max(3, hsl.l - 5));
  return {
    label: '自定义',
    primary,
    primaryDark,
    primaryDarker,
    primaryLight,
    primaryMid,
    primaryMid2,
    heroGradientEnd,
    heroBg: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMid} 25%, ${primaryMid2} 50%, ${heroGradientEnd} 75%, ${primary} 100%)`,
    timelineBg: `linear-gradient(180deg, #fff 0%, ${primaryLight} 50%, #fff 100%)`,
    loginBg: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMid} 30%, ${primaryMid2} 60%, ${primary} 100%)`,
    timelineLine: `linear-gradient(to bottom, ${primaryMid2}, ${primary}, ${primaryMid2})`,
    adminHeaderBg: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
    badgeBg: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
    progressFill: `linear-gradient(90deg, ${primary}, ${primaryDark})`,
    albumCoverBg: `linear-gradient(135deg, ${primaryLight}, ${primaryMid})`,
  };
}
