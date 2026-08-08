/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, CompanyProfile, Order } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-polo',
    name: 'Premium Embroidered Polo Shirt',
    category: 'Uniforms',
    description: 'High-quality 220gsm pique cotton polo with your corporate logo embroidered on the left chest. Durable, breathable, and color-fast.',
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop&q=80',
    basePrice: 18.50,
    originalPrice: 35.00,
    saleCount: 9,
    saleLimit: 10,
    minQuantity: 10,
    unit: 'pcs',
    sizeOptions: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colorOptions: ['Midnight Black', 'Slate Grey', 'Bright White', 'Navy Blue', 'Forest Green'],
    customFields: [
      {
        name: 'EmbroideryPosition',
        type: 'select',
        label: 'Logo Position',
        options: ['Left Chest', 'Right Chest', 'Sleeve', 'Back Collar'],
        required: true
      },
      {
        name: 'StaffNameList',
        type: 'textarea',
        label: 'Sizes & Name Personalization (Optional)',
        placeholder: 'e.g.\nJohn - L - Logo only\nSarah - M - Logo + "Marketing Manager"',
        required: false
      }
    ],
    frequentlyOrdered: true,
    shippingFee: 15.00,
    leadTime: '5-7 Business Days',
    addOns: [
      { id: 'ao-polo-1', name: 'Individual Polybag Packaging', price: 10.00, description: 'Each shirt individually folded and heat-sealed in polybag.' },
      { id: 'ao-polo-2', name: 'Sleeve Logo Embroidery', price: 25.00, description: 'Additional 2-inch logo stitched on left or right sleeve.' }
    ]
  },
  {
    id: 'prod-id',
    name: 'Corporate PVC Identification Card',
    category: 'IDs & Accessories',
    description: 'Double-sided high-definition color print on 30mil durable PVC. Ideal for corporate offices, security gates, and events.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&q=80',
    basePrice: 4.20,
    originalPrice: 8.50,
    saleCount: 5,
    saleLimit: 10,
    minQuantity: 5,
    unit: 'pcs',
    customFields: [
      {
        name: 'IDLayout',
        type: 'select',
        label: 'Approved Template Layout',
        options: ['Standard Vertical v2.1', 'Executive Horizontal v1.0', 'Visitor Temporary Badge'],
        required: true
      },
      {
        name: 'EmployeeDetails',
        type: 'textarea',
        label: 'Employee Details (Name, Role, ID Number)',
        placeholder: 'e.g. Jane Doe | Operations Lead | ID-2026-089',
        required: true
      }
    ],
    frequentlyOrdered: true,
    shippingFee: 5.00,
    addOns: [
      { id: 'ao-id-1', name: 'Magnetic Badge Backing', price: 15.00, description: 'Heavy-duty dual magnet attachment replacing standard clip.' },
      { id: 'ao-id-2', name: 'Polycarbonate Rigid Protector Case', price: 12.00, description: 'Clear protective hard case.' }
    ]
  },
  {
    id: 'prod-lanyard',
    name: 'Custom Sublimated Lanyard (20mm)',
    category: 'IDs & Accessories',
    description: 'Smooth polyester lanyard with full-color heat-transfer corporate branding. Includes premium oval hook and safety breakaway clasp.',
    imageUrl: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop&q=80',
    basePrice: 1.95,
    originalPrice: 3.50,
    saleCount: 8,
    saleLimit: 10,
    minQuantity: 20,
    unit: 'pcs',
    frequentlyOrdered: true,
    shippingFee: 5.00,
    colorOptions: ['Core Black', 'Graphite Grey', 'Branding Accent White'],
    addOns: [
      { id: 'ao-lan-1', name: 'Safety Breakaway Neck Clasp', price: 5.00, description: 'Quick-release safety plastic buckle.' },
      { id: 'ao-lan-2', name: 'Retractable Carabiner Reel', price: 20.00, description: 'Heavy-duty retractable badge reel with 30-inch cord.' }
    ],
    customFields: [
      {
        name: 'AttachmentType',
        type: 'select',
        label: 'Attachment Metal Hook',
        options: ['Premium Swivel Trigger Clip', 'Standard Lobster Claw', 'Bull Dog Clip'],
        required: true
      }
    ]
  },
  {
    id: 'prod-bizcard',
    name: 'Signature Matte Business Cards',
    category: 'Print Materials',
    description: 'Ultra-premium 350gsm artboard with double-sided silk matte lamination. Clean, stiff, and elegant to the touch.',
    imageUrl: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=400&h=400&fit=crop&q=80',
    basePrice: 14.00,
    originalPrice: 25.00,
    saleCount: 9,
    saleLimit: 10,
    minQuantity: 1,
    unit: 'box (100 cards)',
    customFields: [
      {
        name: 'CardDetails',
        type: 'textarea',
        label: 'Card Details & Changes',
        placeholder: 'e.g. Please reprint standard layout for:\nDavid Chen\nSenior Consultant\ndavid@acme.com | +1 (555) 0192',
        required: true
      }
    ],
    frequentlyOrdered: true,
    shippingFee: 8.00,
    addOns: [
      { id: 'ao-biz-1', name: 'Rounded Corner Finishing', price: 8.00, description: 'Die-cut 1/4" radius rounded corners.' },
      { id: 'ao-biz-2', name: 'Spot UV Varnish Accent', price: 20.00, description: 'Glossy raised UV coating over corporate logo.' }
    ]
  },
  {
    id: 'prod-tote',
    name: 'Custom Heavyweight Canvas Tote Bag',
    category: 'Promo Items',
    description: 'Eco-friendly 12oz natural cotton canvas tote with heavy-duty reinforced handles. Single-color screen print of your logo included.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop&q=80',
    basePrice: 3.50,
    originalPrice: 7.50,
    saleCount: 3,
    saleLimit: 10,
    minQuantity: 100,
    unit: 'pcs',
    colorOptions: ['Natural Off-White', 'Deep Black', 'Slate Grey'],
    customFields: [
      {
        name: 'PrintColor',
        type: 'select',
        label: 'Ink Color',
        options: ['Standard Black', 'Standard White', 'Custom Brand Spot Color (Pantone in Notes)'],
        required: true
      }
    ],
    shippingFee: 12.00,
    addOns: [
      { id: 'ao-tote-1', name: 'Bottom Gusset Reinforcement', price: 12.00, description: 'Expanded bottom base panel for heavy items.' },
      { id: 'ao-tote-2', name: 'Inner Zipper Pocket', price: 18.00, description: 'Internal small pocket with zipper closure.' }
    ]
  },
  {
    id: 'prod-pen',
    name: 'Matte Metal Laser-Engraved Pen',
    category: 'Promo Items',
    description: 'Tactile matte finish aluminum pen with silver accents. Your brand name or logo laser-engraved to reveal a shiny silver finish.',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&h=400&fit=crop&q=80',
    basePrice: 2.10,
    originalPrice: 4.50,
    saleCount: 6,
    saleLimit: 10,
    minQuantity: 50,
    unit: 'pcs',
    colorOptions: ['Pitch Black', 'Charcoal', 'Pure White'],
    customFields: [
      {
        name: 'EngravingText',
        type: 'text',
        label: 'Engraving Text (Or type "LOGO")',
        placeholder: 'e.g. ACME DYNAMICS or "Use Vector Logo"',
        required: true
      }
    ],
    shippingFee: 3.50,
    addOns: [
      { id: 'ao-pen-1', name: 'Velvet Gift Pouch', price: 5.00, description: 'Individual black velvet drawstring pouch.' },
      { id: 'ao-pen-2', name: 'Black Gel Ink Refill Pack', price: 10.00, description: 'Extra high-capacity gel refill cartridge.' }
    ]
  },
  {
    id: 'prod-mug',
    name: 'Matte Black Corporate Mug (11oz)',
    category: 'Promo Items',
    description: 'Ceramic coffee mug with a sleek matte black exterior and high-gloss white interior. Single-color print on both sides.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop&q=80',
    basePrice: 5.80,
    originalPrice: 12.00,
    saleCount: 9,
    saleLimit: 10,
    minQuantity: 24,
    unit: 'pcs',
    customFields: [
      {
        name: 'MugPlacement',
        type: 'select',
        label: 'Print Placement',
        options: ['Facing Right-Handed', 'Facing Left-Handed', 'Wrap-around Print'],
        required: true
      }
    ],
    shippingFee: 15.00,
    addOns: [
      { id: 'ao-mug-1', name: 'Individual Kraft Gift Box', price: 8.00, description: 'Custom fit corrugated kraft presentation box.' },
      { id: 'ao-mug-2', name: 'Metallic Foil Print Accent', price: 15.00, description: 'Gold or silver metallic foil emblem.' }
    ]
  }
];

export const INITIAL_COMPANIES: CompanyProfile[] = [
  {
    id: 'co-acme',
    name: 'Acme Corporate Solutions',
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=80&h=80&fit=crop&q=80',
    deliveryAddress: 'Suite 400, 100 Innovation Parkway, Tech District, CA 94016',
    contactPerson: 'Marcus Vance',
    contactEmail: 'marcus.v@acme.corp',
    contactPhone: '+1 (555) 234-5678',
    poRequired: true,
    username: 'acme',
    passcode: 'acme123',
    enabledProductIds: ['prod-polo', 'prod-id', 'prod-lanyard', 'prod-bizcard', 'prod-tote', 'prod-pen', 'prod-mug'] // Acme gets all items
  },
  {
    id: 'co-greenlife',
    name: 'GreenLife Wellness Labs',
    logoUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=80&h=80&fit=crop&q=80',
    deliveryAddress: 'Building B, 88 Organics Way, Seattle, WA 98101',
    contactPerson: 'Sophia Chen',
    contactEmail: 's.chen@greenlife.io',
    contactPhone: '+1 (555) 876-5432',
    poRequired: false,
    username: 'greenlife',
    passcode: 'greenlife123',
    enabledProductIds: ['prod-bizcard', 'prod-mug', 'prod-lanyard'] // GreenLife gets only a subset of corporate items
  },
  {
    id: 'co-arhprint',
    name: 'ARH Print (Internal/Promo)',
    logoUrl: '',
    deliveryAddress: 'ARH Print HQ, 500 Inkstone St, Design District, NY 10001',
    contactPerson: 'Demo Manager',
    contactEmail: 'regie.yoonet@gmail.com',
    contactPhone: '+1 (555) 901-2345',
    poRequired: false,
    username: 'arhprint',
    passcode: 'arhprint123',
    enabledProductIds: ['prod-polo', 'prod-tote', 'prod-pen'] // Internal gets polo, tote, pen
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'RP-2026-1001',
    companyName: 'Acme Corporate Solutions',
    contactEmail: 'marcus.v@acme.corp',
    contactPerson: 'Marcus Vance',
    contactNumber: '+63 917 555 1001',
    fbMessengerLink: 'm.me/marcusvance',
    deliveryAddress: 'Suite 400, 100 Innovation Parkway, Tech District, CA 94016',
    poNumber: 'PO-99182',
    notes: 'Please ensure high-contrast embroidery thread on black polo shirts.',
    items: [
      {
        productId: 'prod-polo',
        productName: 'Premium Embroidered Polo Shirt',
        imageUrl: '👕',
        quantity: 25,
        price: 18.50,
        selectedSize: 'L',
        selectedColor: 'Midnight Black',
        customDetails: {
          'Logo Position': 'Left Chest',
          'Sizes & Name Personalization (Optional)': '10 x M, 10 x L, 5 x XL - Logo Only'
        }
      },
      {
        productId: 'prod-lanyard',
        productName: 'Custom Sublimated Lanyard (20mm)',
        imageUrl: '🎗️',
        quantity: 100,
        price: 1.95,
        selectedColor: 'Core Black',
        customDetails: {
          'Attachment Metal Hook': 'Premium Swivel Trigger Clip'
        }
      }
    ],
    status: 'Completed',
    totalAmount: 657.50,
    createdAt: '2026-06-15T10:30:00-07:00'
  },
  {
    id: 'ord-1002',
    orderNumber: 'RP-2026-1002',
    companyName: 'GreenLife Wellness Labs',
    contactEmail: 's.chen@greenlife.io',
    contactPerson: 'Sophia Chen',
    contactNumber: '+63 918 876 5432',
    fbMessengerLink: 'fb.com/sophiachen.greenlife',
    deliveryAddress: 'Building B, 88 Organics Way, Seattle, WA 98101',
    notes: 'Please leave packages with the receptionist at Floor 1.',
    items: [
      {
        productId: 'prod-bizcard',
        productName: 'Signature Matte Business Cards',
        imageUrl: '',
        quantity: 5,
        price: 14.00,
        customDetails: {
          'Card Details & Changes': 'Sophia Chen\nDirector of Research\ns.chen@greenlife.io | +1 (555) 876-5432'
        }
      },
      {
        productId: 'prod-id',
        productName: 'Corporate PVC Identification Card',
        imageUrl: '🪪',
        quantity: 12,
        price: 4.20,
        customDetails: {
          'Approved Template Layout': 'Standard Vertical v2.1',
          'Employee Details (Name, Role, ID Number)': '12 new research interns. Roster uploaded to shared folder.'
        }
      }
    ],
    status: 'In Production',
    totalAmount: 120.40,
    createdAt: '2026-07-01T14:15:00-07:00'
  },
  {
    id: 'ord-1003',
    orderNumber: 'RP-2026-1003',
    companyName: 'Acme Corporate Solutions',
    contactEmail: 'marcus.v@acme.corp',
    contactPerson: 'Marcus Vance',
    contactNumber: '+63 917 555 1001',
    fbMessengerLink: 'm.me/marcusvance',
    deliveryAddress: 'Suite 400, 100 Innovation Parkway, Tech District, CA 94016',
    poNumber: 'PO-99554',
    notes: 'Laser engraving on pen clips must be centered.',
    items: [
      {
        productId: 'prod-pen',
        productName: 'Matte Metal Laser-Engraved Pen',
        imageUrl: '🖊️',
        quantity: 150,
        price: 2.10,
        selectedColor: 'Charcoal',
        customDetails: {
          'Engraving Text (Or type "LOGO")': 'ACME SOLUTIONS'
        }
      }
    ],
    status: 'Pending',
    totalAmount: 315.00,
    createdAt: '2026-07-12T09:00:00-07:00'
  }
];

export const INITIAL_PORTALS = [
  {
    id: 'portal-101',
    companyId: 'co-1',
    companyName: 'Acme Corporate Solutions',
    name: 'Staff Uniforms Q3/Q4',
    description: 'Select your preferred polo shirt size and embroidery position for the upcoming corporate team onboarding.',
    status: 'Active' as const,
    productIds: ['prod-polo', 'prod-id', 'prod-lanyard'],
    createdAt: '2026-07-15T10:00:00.000Z',
    updatedAt: '2026-07-20T11:30:00.000Z',
    shareToken: 'portal-acme-staff-2026'
  },
  {
    id: 'portal-102',
    companyId: 'co-1',
    companyName: 'Acme Corporate Solutions',
    name: 'Executive & Resale Merchandise',
    description: 'B2B order link for sales executives ordering client welcome kits and engraved pens.',
    status: 'Active' as const,
    productIds: ['prod-tumbler', 'prod-pen', 'prod-mug'],
    createdAt: '2026-07-18T14:20:00.000Z',
    updatedAt: '2026-07-22T09:15:00.000Z',
    shareToken: 'portal-acme-exec-2026'
  },
  {
    id: 'portal-103',
    companyId: 'co-2',
    companyName: 'GreenLife Logistics',
    name: 'GreenLife Corporate Storefront',
    description: 'Official promotional apparel and corporate gear for GreenLife Logistics team members.',
    status: 'Active' as const,
    productIds: ['prod-polo', 'prod-cap', 'prod-bag', 'prod-tumbler'],
    createdAt: '2026-07-19T08:00:00.000Z',
    updatedAt: '2026-07-22T10:00:00.000Z',
    shareToken: 'portal-greenlife'
  },
  {
    id: 'portal-104',
    companyId: 'co-3',
    companyName: 'Internal Operations',
    name: 'Internal Operations Storefront',
    description: 'Internal requisitions and supply order portal for internal operations staff.',
    status: 'Active' as const,
    productIds: ['prod-polo', 'prod-cap', 'prod-bag', 'prod-tumbler', 'prod-pen', 'prod-mug', 'prod-id', 'prod-lanyard'],
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-22T10:00:00.000Z',
    shareToken: 'portal-internal'
  }
];

