import { Product, OrderPortal } from '../types';

/**
 * Gets the unit price for a product based on selected size/color variants
 * and any custom portal pricing/markup set by the company admin.
 */
export function getProductUnitPrice(
  product: Product,
  selectedSize?: string,
  selectedColor?: string,
  portal?: OrderPortal | null
): number {
  if (!product) return 0;

  const sizeKey = selectedSize?.trim();
  const colorKey = selectedColor?.trim();
  const comboKey = (sizeKey && colorKey) ? `${sizeKey} / ${colorKey}` : undefined;

  // 1. Check custom portal pricing if portal is active
  if (portal) {
    if (portal.customVariantPrices?.[product.id]) {
      const pVarPrices = portal.customVariantPrices[product.id];
      const checkVal = (k?: string) => {
        if (k && pVarPrices[k] !== undefined && pVarPrices[k] !== null && (pVarPrices[k] as any) !== '') {
          const num = Number(pVarPrices[k]);
          if (!isNaN(num)) return num;
        }
        return undefined;
      };
      const combo = checkVal(comboKey);
      if (combo !== undefined) return combo;
      const size = checkVal(sizeKey);
      if (size !== undefined) return size;
      const color = checkVal(colorKey);
      if (color !== undefined) return color;
    }
    if (portal.customPrices?.[product.id] !== undefined && portal.customPrices[product.id] !== null && (portal.customPrices[product.id] as any) !== '') {
      const num = Number(portal.customPrices[product.id]);
      if (!isNaN(num)) return num;
    }
  }

  // 2. Check product variant prices
  if (product.variantPrices) {
    if (comboKey && typeof product.variantPrices[comboKey] === 'number') return product.variantPrices[comboKey];
    if (sizeKey && typeof product.variantPrices[sizeKey] === 'number') return product.variantPrices[sizeKey];
    if (colorKey && typeof product.variantPrices[colorKey] === 'number') return product.variantPrices[colorKey];
  }

  // 3. Fallback to product base price
  return Number(product.basePrice) || 0;
}

/**
 * Gets the price for a product add-on, respecting custom portal add-on pricing if set.
 */
export function getAddOnUnitPrice(
  product: Product,
  addOn: { id?: string; name: string; price: number },
  portal?: OrderPortal | null
): number {
  if (!product || !addOn) return 0;
  const addOnKey = addOn.id || addOn.name;

  if (portal && portal.customAddOnPrices?.[product.id]) {
    const pAddOnPrices = portal.customAddOnPrices[product.id];
    if (addOnKey && pAddOnPrices[addOnKey] !== undefined && pAddOnPrices[addOnKey] !== null && (pAddOnPrices[addOnKey] as any) !== '') {
      const num = Number(pAddOnPrices[addOnKey]);
      if (!isNaN(num)) return num;
    }
    if (addOn.name && pAddOnPrices[addOn.name] !== undefined && pAddOnPrices[addOn.name] !== null && (pAddOnPrices[addOn.name] as any) !== '') {
      const num = Number(pAddOnPrices[addOn.name]);
      if (!isNaN(num)) return num;
    }
  }

  return Number(addOn.price) || 0;
}

/**
 * Generates a unique composite key for a cart line item based on product ID and configurations.
 */
export function makeCompositeId(
  productId: string,
  size?: string,
  color?: string,
  customs: Record<string, string> = {}
): string {
  const parts = [productId];
  if (size) parts.push(`sz-${size}`);
  if (color) parts.push(`col-${color}`);

  const sortedCustoms = Object.keys(customs || {})
    .filter(k => customs[k] !== undefined && customs[k] !== null && String(customs[k]).trim() !== '')
    .sort()
    .map(k => `${k}:${String(customs[k]).trim()}`)
    .join('|');

  if (sortedCustoms) parts.push(`cust-${sortedCustoms}`);
  return parts.join('_');
}

