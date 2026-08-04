/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogProduct, QuoteEnquiry } from '../types';
import { parseColorList } from '../utils/colorUtils';

export function sanitizeCatalogProduct(p: CatalogProduct): CatalogProduct {
  const initMatch = INITIAL_CATALOG_PRODUCTS.find(
    i => (p.id && i.id === p.id) || (p.sku && i.sku === p.sku) || (p.name && i.name.toLowerCase().trim() === p.name.toLowerCase().trim())
  );

  let brandingMethods = (p.brandingMethods && p.brandingMethods.length > 0)
    ? p.brandingMethods
    : (initMatch?.brandingMethods && initMatch.brandingMethods.length > 0
        ? [...initMatch.brandingMethods]
        : ['Laser Engraving', 'Screen Printing', 'Digital Print']);

  let colors = (p.colors && p.colors.length > 0)
    ? parseColorList(p.colors)
    : (initMatch?.colors && initMatch.colors.length > 0
        ? parseColorList(initMatch.colors)
        : [
            { name: 'Onyx Black', hex: '#212121' },
            { name: 'Pure White', hex: '#FFFFFF' },
            { name: 'Navy Blue', hex: '#1B2A4A' }
          ]);

  if (colors.length === 0) {
    colors = [
      { name: 'Onyx Black', hex: '#212121' },
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Navy Blue', hex: '#1B2A4A' }
    ];
  }

  return {
    ...p,
    brandingMethods,
    colors,
    colorImages: p.colorImages || initMatch?.colorImages || {},
    variantPrices: p.variantPrices || initMatch?.variantPrices || {},
    moq: p.moq || initMatch?.moq || 50,
    leadTime: p.leadTime || initMatch?.leadTime || '7-10 Business Days',
    specifications: p.specifications || initMatch?.specifications || '',
    description: p.description || initMatch?.description || ''
  };
}

export const INITIAL_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'cat-pen-01',
    name: 'Moso Bamboo Pen',
    category: 'Stationery & Pens',
    description: 'Eco-friendly push-button ballpoint pen crafted from 100% natural Moso bamboo with polished silver accents and German blue ink refill.',
    specifications: 'Material: Natural Moso Bamboo & Aluminum | Ink Color: German Blue Refill | Length: 14cm | Weight: 18g | Mechanism: Click Action',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585336261026-8f5786372960?w=600&h=600&fit=crop&q=80'
    ],
    moq: 100,
    brandingMethods: ['Laser Engraving', 'Pad Printing'],
    colors: [
      { name: 'Natural Bamboo', hex: '#D2B48C' },
      { name: 'Onyx Black', hex: '#212121' }
    ],
    colorImages: {
      'Natural Bamboo': 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&h=600&fit=crop&q=80',
      'Onyx Black': 'https://images.unsplash.com/photo-1585336261026-8f5786372960?w=600&h=600&fit=crop&q=80'
    },
    status: 'Active',
    createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'cat-flyer-01',
    name: 'Aero Flyer - Small',
    category: 'Promo & Outdoor',
    description: 'Lightweight aerodynamic flying disc engineered for stable flight trajectories. Perfect for outdoor corporate events, sports retreats, and festival giveaways.',
    specifications: 'Diameter: 18cm | Weight: 60g | Material: High-density BPA-Free Flexible Polypropylene | Temperature Range: -10°C to 50°C',
    imageUrl: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?w=600&h=600&fit=crop&q=80'
    ],
    moq: 250,
    brandingMethods: ['Screen Printing', 'Digital Print'],
    colors: [
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Canary Yellow', hex: '#FFD700' },
      { name: 'Sunset Orange', hex: '#FF7F00' },
      { name: 'Cherry Red', hex: '#DC143C' },
      { name: 'Emerald Green', hex: '#2ECC71' },
      { name: 'Royal Blue', hex: '#2563EB' },
      { name: 'Pitch Black', hex: '#111111' }
    ],
    status: 'Active',
    createdAt: '2026-06-02T08:00:00Z'
  },
  {
    id: 'cat-cap-01',
    name: 'Vintage Washed Cap',
    category: 'Headwear',
    description: 'Unstructured 6-panel low-profile cap with vintage garment wash treatment, embroidered eyelets, and an adjustable antique brass buckle closure.',
    specifications: 'Fabric: 100% Pre-washed Cotton Twill | Profile: Low Unstructured | Visor: Pre-curved | Strap: Self-fabric with Antique Brass Buckle',
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521369984125-a40d58852f6d?w=600&h=600&fit=crop&q=80'
    ],
    moq: 50,
    brandingMethods: ['Embroidery', 'Heat Transfer', 'Woven Patch'],
    colors: [
      { name: 'Khaki Beige', hex: '#C3B091' },
      { name: 'Harvest Gold', hex: '#DAA520' },
      { name: 'Sunset Orange', hex: '#FF5722' },
      { name: 'Berry Pink', hex: '#E91E63' },
      { name: 'Crimson Red', hex: '#B71C1C' },
      { name: 'Sage Green', hex: '#8FBC8F' },
      { name: 'Forest Green', hex: '#1E392A' },
      { name: 'Washed Navy', hex: '#2C3E50' },
      { name: 'Royal Blue', hex: '#1976D2' },
      { name: 'Slate Black', hex: '#212121' }
    ],
    colorImages: {
      'Khaki Beige': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop&q=80',
      'Washed Navy': 'https://images.unsplash.com/photo-1521369984125-a40d58852f6d?w=600&h=600&fit=crop&q=80'
    },
    status: 'Active',
    createdAt: '2026-06-03T08:00:00Z'
  },
  {
    id: 'cat-hat-01',
    name: 'Bondi Washed Bucket Hat',
    category: 'Headwear',
    description: 'Casual sun hat tailored from heavy garment-washed cotton canvas. Features sewn ventilation eyelets and a relaxed downward brim for sun protection.',
    specifications: 'Fabric: Heavy Washed Cotton Canvas | Brim Width: 6cm | Crown Height: 9cm | Sizing: Unisex Standard 58cm',
    imageUrl: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&h=600&fit=crop&q=80'
    ],
    moq: 50,
    brandingMethods: ['Embroidery', 'Woven Label', 'Screen Printing'],
    colors: [
      { name: 'Cream Beige', hex: '#F5F5DC' },
      { name: 'Sun Yellow', hex: '#F1C40F' },
      { name: 'Coral Orange', hex: '#E67E22' },
      { name: 'Rose Pink', hex: '#FF69B4' },
      { name: 'Ruby Red', hex: '#C0392B' },
      { name: 'Olive Drab', hex: '#556B2F' },
      { name: 'Mint Green', hex: '#A3E4D7' },
      { name: 'Denim Blue', hex: '#2980B9' },
      { name: 'Midnight Black', hex: '#1C1C1C' }
    ],
    status: 'Active',
    createdAt: '2026-06-04T08:00:00Z'
  },
  {
    id: 'cat-salad-01',
    name: 'Keepsake Luca Salad Servers',
    category: 'Executive Gifts',
    description: 'Hand-carved solid Acacia wood salad spoon and fork set in an embossed luxury presentation box. Ideal for high-value executive appreciation gifts.',
    specifications: 'Material: FSC-Certified Solid Acacia Wood | Finish: Food-grade Mineral Oil Lamination | Dimensions: 28cm x 7cm | Packaging: Custom Black Rigid Box',
    imageUrl: 'https://images.unsplash.com/photo-1615865417491-958610834317?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1615865417491-958610834317?w=600&h=600&fit=crop&q=80'
    ],
    moq: 25,
    brandingMethods: ['Laser Engraving', 'Hot Stamping'],
    colors: [
      { name: 'Walnut Wood', hex: '#5C4033' },
      { name: 'Natural Acacia', hex: '#A0522D' }
    ],
    status: 'Active',
    createdAt: '2026-06-05T08:00:00Z'
  },
  {
    id: 'cat-knives-01',
    name: 'Keepsake Luca Cheese Knives',
    category: 'Executive Gifts',
    description: '3-piece specialty cheese knife set featuring high-carbon stainless steel blades and ergonomic wooden handles packaged in a magnetic keepsake box.',
    specifications: 'Blades: 420 Grade Stainless Steel | Handles: Hand-sanded Hardwood | Set Includes: Cleaver, Soft Cheese Knife, Spreader | Box: Foil Stamped Rigid Box',
    imageUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&h=600&fit=crop&q=80'
    ],
    moq: 25,
    brandingMethods: ['Laser Engraving', 'Hot Stamping'],
    colors: [
      { name: 'Walnut Wood', hex: '#5C4033' },
      { name: 'Natural Oak', hex: '#C19A6B' }
    ],
    status: 'Active',
    createdAt: '2026-06-06T08:00:00Z'
  },
  {
    id: 'cat-tumbler-01',
    name: 'Keepsake Arlo Tumblers - Set of 4',
    category: 'Drinkware',
    description: 'Set of 4 stackable borosilicate glass tumblers designed for hot coffee, cocktails, or iced water. Includes protective custom-molded foam gift packaging.',
    specifications: 'Capacity: 350ml (12 oz) each | Glass: Thermal Borosilicate Glass (-20°C to 150°C) | Dishwasher Safe: Yes | Quantity: 4 Tumblers per Box',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80'
    ],
    moq: 30,
    brandingMethods: ['Laser Engraving', 'Screen Printing', 'Pad Printing'],
    colors: [
      { name: 'Smoke Grey', hex: '#4A4A4A' },
      { name: 'Amber Gold', hex: '#FFBF00' },
      { name: 'Clear Crystal', hex: '#E0F7FA' }
    ],
    status: 'Active',
    createdAt: '2026-06-07T08:00:00Z'
  },
  {
    id: 'cat-mug-01',
    name: 'Keepsake Moda Coffee Mug - Set of 2',
    category: 'Drinkware',
    description: 'Pair of heavy ceramic stoneware mugs with tactile matte outer glaze and smooth interior satin finish in a windowed gift box.',
    specifications: 'Capacity: 400ml (14 oz) each | Material: Lead-Free Heavy Stoneware | Microwave & Dishwasher Safe: Yes | Box: Recyclable Kraft Gift Box',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80'
    ],
    moq: 40,
    brandingMethods: ['Laser Engraving', 'Pad Printing'],
    colors: [
      { name: 'Matte Black', hex: '#1E1E1E' },
      { name: 'Forest Olive', hex: '#3B4E32' },
      { name: 'Warm Off-White', hex: '#F5F5F0' }
    ],
    status: 'Active',
    createdAt: '2026-06-08T08:00:00Z'
  },
  {
    id: 'cat-sushi-01',
    name: 'Keepsake Sushi Set',
    category: 'Executive Gifts',
    description: 'Complete 8-piece Japanese dining presentation set including dark slate serving board, ceramic sauce dishes, bamboo chopsticks, and ceramic rests.',
    specifications: 'Includes: 1 Natural Slate Tray (30cm x 15cm), 2 Ceramic Soy Bowls, 2 Bamboo Chopstick Pairs, 2 Rests | Packaging: Matte Black Ribbon Box',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=600&fit=crop&q=80'
    ],
    moq: 20,
    brandingMethods: ['Laser Engraving', 'Screen Printing'],
    colors: [
      { name: 'Onyx Black', hex: '#1A1A1A' },
      { name: 'Natural Bamboo', hex: '#D2B48C' }
    ],
    status: 'Active',
    createdAt: '2026-06-09T08:00:00Z'
  },
  {
    id: 'cat-carafe-01',
    name: 'Keepsake Arlo Carafe',
    category: 'Drinkware',
    description: 'Architectural glass water carafe with a matching tumbler that doubles as a hygienic dust cap. Tailored for executive boardrooms and guest suites.',
    specifications: 'Carafe Capacity: 900ml | Tumbler Capacity: 250ml | Material: Hand-blown Lead-free Crystal Glass | Heat Tolerance: up to 100°C',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=600&fit=crop&q=80'
    ],
    moq: 25,
    brandingMethods: ['Laser Engraving', 'Screen Printing'],
    colors: [
      { name: 'Smoke Grey Glass', hex: '#3A3D40' },
      { name: 'Crystal Clear', hex: '#F0F8FF' }
    ],
    status: 'Active',
    createdAt: '2026-06-10T08:00:00Z'
  },
  {
    id: 'cat-diary-01',
    name: 'Pierre Cardin Fontaine Weekly Diary - 2027',
    category: 'Stationery & Pens',
    description: 'Luxury synthetic leather desk diary with weekly grid layout, satin ribbon bookmark, metal accent tab, and gold-gilded page edges.',
    specifications: 'Size: A5 Executive (21cm x 14.8cm) | Paper: 80gsm Cream Acid-Free | Binding: Thread Sewn 160 Pages | Metal Clasp: Matte Silver',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop&q=80'
    ],
    moq: 50,
    brandingMethods: ['Hot Stamping', 'Debossing', 'Screen Printing'],
    colors: [
      { name: 'Obsidian Black', hex: '#111111' },
      { name: 'Navy Blue', hex: '#0F172A' },
      { name: 'Wine Red', hex: '#722F37' }
    ],
    status: 'Active',
    createdAt: '2026-06-11T08:00:00Z'
  }
];

export const INITIAL_QUOTE_ENQUIRIES: QuoteEnquiry[] = [
  {
    id: 'qe-1001',
    enquiryNumber: 'QE-2026-101',
    productId: 'cat-pen-01',
    productName: 'Moso Bamboo Pen',
    productCategory: 'Stationery & Pens',
    companyId: 'co-acme',
    companyName: 'Acme Corporate Solutions',
    contactPerson: 'Marcus Vance',
    contactEmail: 'marcus.v@acme.corp',
    contactPhone: '+1 (555) 234-5678',
    quantity: 500,
    preferredBrandingMethod: 'Laser Engraving',
    preferredColor: 'Natural Bamboo',
    notes: 'Interested in laser engraving our ACME logo on the barrel. Need delivery by late September for annual conference.',
    status: 'New',
    createdAt: '2026-07-20T11:30:00Z'
  },
  {
    id: 'qe-1002',
    enquiryNumber: 'QE-2026-102',
    productId: 'cat-tumbler-01',
    productName: 'Keepsake Arlo Tumblers - Set of 4',
    productCategory: 'Drinkware',
    companyId: 'co-greenlife',
    companyName: 'GreenLife Wellness Labs',
    contactPerson: 'Sophia Chen',
    contactEmail: 's.chen@greenlife.io',
    contactPhone: '+1 (555) 876-5432',
    quantity: 100,
    preferredBrandingMethod: 'Laser Engraving',
    preferredColor: 'Smoke Grey',
    notes: 'For end-of-year executive client gifts. Please quote custom gift box sleeve printing as well.',
    status: 'In Review',
    createdAt: '2026-07-21T09:15:00Z'
  }
];
