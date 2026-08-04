import { ColorOption } from '../types';

export const COMMON_COLOR_HEXES: Record<string, string> = {
  'natural bamboo': '#D2B48C',
  'bamboo': '#D2B48C',
  'onyx black': '#212121',
  'pitch black': '#111111',
  'slate black': '#212121',
  'black': '#000000',
  'pure white': '#FFFFFF',
  'white': '#FFFFFF',
  'canary yellow': '#FFD700',
  'sun yellow': '#F1C40F',
  'yellow': '#EAB308',
  'sunset orange': '#FF7F00',
  'coral orange': '#E67E22',
  'orange': '#EA580C',
  'cherry red': '#DC143C',
  'ruby red': '#C0392B',
  'crimson red': '#B71C1C',
  'red': '#DC2626',
  'emerald green': '#2ECC71',
  'mint green': '#A3E4D7',
  'sage green': '#8FBC8F',
  'forest green': '#14532D',
  'green': '#16A34A',
  'royal blue': '#2563EB',
  'washed navy': '#2C3E50',
  'navy blue': '#1B2A4A',
  'navy': '#1B2A4A',
  'blue': '#3B82F6',
  'khaki beige': '#C3B091',
  'khaki': '#C3B091',
  'cream beige': '#F5F5DC',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'harvest gold': '#DAA520',
  'gold': '#D97706',
  'berry pink': '#E91E63',
  'rose pink': '#FF69B4',
  'pink': '#EC4899',
  'olive drab': '#556B2F',
  'olive': '#556B2F',
  'silver': '#C0C0C0',
  'grey': '#6B7280',
  'gray': '#6B7280',
  'charcoal': '#374151',
  'purple': '#9333EA',
  'brown': '#78350F'
};

export function resolveColorHex(name: string, fallbackHex?: string): string {
  if (fallbackHex && fallbackHex !== '#888888' && fallbackHex !== '#CCCCCC' && fallbackHex.startsWith('#')) {
    return fallbackHex;
  }
  const clean = name.toLowerCase().trim();
  if (COMMON_COLOR_HEXES[clean]) {
    return COMMON_COLOR_HEXES[clean];
  }
  for (const [key, hex] of Object.entries(COMMON_COLOR_HEXES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return hex;
    }
  }
  return fallbackHex || '#6B7280';
}

export function parseColorList(val: any): ColorOption[] {
  if (!val) return [];

  let list: any[] = [];

  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed);
      } catch (e) {
        list = trimmed.slice(1, -1).split(/[,;/|]/);
      }
    } else {
      list = trimmed.split(/[,;/|]/);
    }
  } else if (typeof val === 'object') {
    list = [val];
  }

  return list
    .map(item => {
      if (!item) return null;
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;
        return { name, hex: resolveColorHex(name) };
      }
      if (typeof item === 'object' && item.name) {
        const name = String(item.name).trim();
        return { name, hex: resolveColorHex(name, item.hex) };
      }
      return null;
    })
    .filter((c): c is ColorOption => Boolean(c && c.name));
}

export function getItemColorImage(product: { imageUrl?: string; colorImages?: Record<string, string> } | undefined, selectedColor?: string): string {
  if (!product) return '';
  const fallback = product.imageUrl || '';
  if (selectedColor && product.colorImages) {
    const keys = Object.keys(product.colorImages);
    const matchedKey = keys.find(k => k.toLowerCase().trim() === selectedColor.toLowerCase().trim());
    if (matchedKey && product.colorImages[matchedKey]) {
      return product.colorImages[matchedKey];
    }
  }
  return fallback;
}
