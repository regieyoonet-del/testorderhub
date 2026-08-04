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
