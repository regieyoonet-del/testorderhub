/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Order, CartItem } from '../types';
import { Calendar, RefreshCw, ChevronDown, ChevronUp, Clock, Package, CheckCircle2, Truck, ArrowRight, Store, Layers, ExternalLink } from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  selectedCompanyName: string;
  onReorderPastOrder: (order: Order) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
  appsScriptUrl?: string;
}

export default function OrderHistory({
  orders,
  selectedCompanyName,
  onReorderPastOrder,
  onUpdateOrderStatus,
  appsScriptUrl
}: OrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reorderedId, setReorderedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'portal' | 'direct'>('all');

  // Filter orders to only show the ones matching the selected active company
  const companyOrders = useMemo(() => {
    return orders.filter(
      o => o.companyName.toLowerCase() === selectedCompanyName.toLowerCase()
    );
  }, [orders, selectedCompanyName]);

  const portalOrders = useMemo(() => {
    return companyOrders.filter(
      o => o.id.startsWith('ord-portal-') || o.status === 'Pending Approval' || Boolean(o.portalId) || Boolean(o.portalName)
    );
  }, [companyOrders]);

  const directOrders = useMemo(() => {
    return companyOrders.filter(
      o => !(o.id.startsWith('ord-portal-') || o.status === 'Pending Approval' || Boolean(o.portalId) || Boolean(o.portalName))
    );
  }, [companyOrders]);

  const displayedOrders = useMemo(() => {
    if (activeTab === 'portal') return portalOrders;
    if (activeTab === 'direct') return directOrders;
    return companyOrders;
  }, [activeTab, companyOrders, portalOrders, directOrders]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  const handleReorderClick = (order: Order) => {
    onReorderPastOrder(order);
    setReorderedId(order.id);
    setTimeout(() => {
      setReorderedId(null);
    }, 2000);
  };

  const getStatusBadge = (status: Order['status']) => {
    const commonStyle = "text-[10px] font-mono uppercase px-2 py-0.5 border font-bold flex items-center gap-1 shrink-0 rounded-md";
    switch (status) {
      case 'Reviewed':
        return (
          <span className={`${commonStyle} bg-purple-100 text-purple-900 border-purple-300`}>
            ✓ Reviewed
          </span>
        );
      case 'To Order':
        return (
          <span className={`${commonStyle} bg-amber-100 text-amber-900 border-amber-300`}>
            <Clock className="w-3 h-3 text-amber-700" /> To Order
          </span>
        );
      case 'Ordered':
        return (
          <span className={`${commonStyle} bg-blue-100 text-blue-900 border-blue-300`}>
            ● Ordered
          </span>
        );
      case 'Admin Received':
        return (
          <span className={`${commonStyle} bg-teal-100 text-teal-900 border-teal-300`}>
            ✓ Admin Received
          </span>
        );
      case 'Customer Claimed':
        return (
          <span className={`${commonStyle} bg-emerald-100 text-emerald-900 border-emerald-300`}>
            ✓ Customer Claimed
          </span>
        );
      case 'Delivered':
        return (
          <span className={`${commonStyle} bg-green-100 text-green-900 border-green-300`}>
            <Truck className="w-3 h-3 text-green-700" /> Delivered
          </span>
        );
      case 'Picked Up':
        return (
          <span className={`${commonStyle} bg-indigo-100 text-indigo-900 border-indigo-300`}>
            ✓ Picked Up
          </span>
        );
      case 'Pending Approval':
        return (
          <span className={`${commonStyle} bg-amber-100 text-amber-900 border-amber-300 animate-pulse`}>
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
          </span>
        );
      case 'Pending':
        return (
          <span className={`${commonStyle} bg-gray-100 text-gray-800 border-gray-300`}>
            <Clock className="w-3 h-3 text-gray-500" /> Submitted to Admin
          </span>
        );
      case 'Approved':
        return (
          <span className={`${commonStyle} bg-gray-50 text-black border-black`}>
            ✓ Approved
          </span>
        );
      case 'In Production':
        return (
          <span className={`${commonStyle} bg-black text-white border-black animate-pulse`}>
            ● In Production
          </span>
        );
      case 'Shipped':
        return (
          <span className={`${commonStyle} bg-black text-white border-black`}>
            <Truck className="w-3 h-3 text-white" /> Shipped
          </span>
        );
      case 'Completed':
        return (
          <span className={`${commonStyle} bg-white text-black border-black border-2`}>
            ✓ Completed
          </span>
        );
      default:
        return <span className={`${commonStyle} bg-gray-100 text-gray-700 border-gray-300`}>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-black pb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">Order History</h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedCompanyName} Records</p>
        </div>

        {/* Source Filter Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 border border-gray-200 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
            id="history-tab-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All ({companyOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portal')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'portal'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
            id="history-tab-portal"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Order Portals ({portalOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
            id="history-tab-direct"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Direct Catalog ({directOrders.length})</span>
          </button>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-12 text-center space-y-3 bg-gray-50/50 rounded-2xl">
          <Package className="w-8 h-8 text-gray-300 mx-auto" />
          <h3 className="font-bold text-sm text-black uppercase tracking-tight">
            {activeTab === 'portal' ? 'No Order Portal Requests' : activeTab === 'direct' ? 'No Direct Catalog Orders' : 'No Order Records Found'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans">
            {activeTab === 'portal'
              ? `There are no order requests submitted via public storefront portal links for ${selectedCompanyName} yet.`
              : activeTab === 'direct'
              ? `No direct catalog orders have been placed under ${selectedCompanyName}.`
              : `There are no past orders logged under ${selectedCompanyName} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const isPortal = order.id.startsWith('ord-portal-') || order.status === 'Pending Approval' || Boolean(order.portalId) || Boolean(order.portalName);

            return (
              <div
                key={order.id}
                className="bg-white border border-black hover:border-black transition-all rounded-none"
                id={`order-record-${order.id}`}
              >
                {/* Order Summary Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-black uppercase">
                        {order.orderNumber}
                      </span>
                      {order.poNumber && (
                        <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 border border-gray-200">
                          PO: {order.poNumber}
                        </span>
                      )}
                      {order.portalName ? (
                        <span className="text-[9px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 font-bold uppercase flex items-center gap-1">
                          <Store className="w-3 h-3 text-amber-600" />
                          Portal: {order.portalName}
                        </span>
                      ) : isPortal ? (
                        <span className="text-[9px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 font-bold uppercase flex items-center gap-1">
                          <Store className="w-3 h-3 text-amber-600" />
                          Order Portal Link
                        </span>
                      ) : null}
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formattedDate}
                      </span>
                      <span>·</span>
                      <span>By <strong className="text-black font-semibold">{order.contactPerson || order.contactEmail || 'Storefront Purchaser'}</strong></span>
                      <span>·</span>
                      <span className="font-bold text-black">{order.items.length} items</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t border-gray-100 pt-3 md:border-none md:pt-0 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block">Order Total</span>
                      <span className="text-base font-extrabold text-black font-mono">Php {order.totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="border border-gray-200 p-2 text-gray-500 hover:text-black hover:border-black transition-colors"
                        aria-label="Expand details"
                        id={`expand-order-btn-${order.id}`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Item Breakdown */}
                {isExpanded && (
                  <div className="border-t border-black bg-gray-50/50 p-5 space-y-4 animate-slide-down">
                    <div className="space-y-3.5">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono">Order Line Items</h4>
                      <div className="divide-y divide-gray-200 border-y border-gray-200">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-start space-x-3">
                              {item.imageUrl && item.imageUrl.startsWith('http') ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-10 h-10 object-cover bg-white border border-gray-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xl p-1 bg-white border border-gray-200 w-10 h-10 flex items-center justify-center select-none shrink-0">
                                  {item.imageUrl && item.imageUrl.length <= 4 ? item.imageUrl : '📦'}
                                </span>
                              )}
                              <div>
                                <span className="font-bold text-xs text-black block uppercase tracking-tight">{item.productName}</span>
                                <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-gray-500 font-mono mt-0.5">
                                  {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                                  {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                                  {item.customDetails && Object.entries(item.customDetails).map(([k, v]) => (
                                    v ? <span key={k}>{k}: {v}</span> : null
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-xs font-mono">
                              <span className="text-gray-500">{item.quantity} units × Php {item.price.toFixed(2)} = </span>
                              <span className="font-bold text-black">Php {(item.quantity * item.price).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.status === 'Pending Approval' && onUpdateOrderStatus && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-amber-900 uppercase block">
                            ⏳ Portal Request Pending Company Review
                          </span>
                          <p className="text-xs text-amber-800">
                            This order was submitted via portal link. Review items and submit to admin for official ordering.
                          </p>
                        </div>
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'Pending')}
                          className="bg-black text-white hover:bg-neutral-800 font-extrabold text-xs uppercase px-4 py-2.5 rounded-lg border border-black shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                          id={`history-submit-admin-${order.id}`}
                        >
                          <span>Submit Order to Admin</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-gray-600">
                      <div>
                        <span className="font-bold text-black uppercase block text-[10px] font-mono">Shipping Address</span>
                        <p className="mt-1 leading-normal font-sans text-gray-800">{order.deliveryAddress || 'No shipping address specified'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-black uppercase block text-[10px] font-mono">Purchaser &amp; Delivery Details</span>
                        <p className="mt-1 leading-normal font-sans text-gray-800">
                          <span className="font-bold text-black">Purchaser:</span> {order.contactPerson || 'Storefront Customer'}{' '}
                          {order.contactEmail && (
                            <span className="text-gray-600 font-mono text-[11px]">(<a href={`mailto:${order.contactEmail}`} className="underline text-blue-600">{order.contactEmail}</a>)</span>
                          )}
                        </p>
                        {order.contactNumber && (
                          <p className="mt-1 text-gray-800 font-bold font-mono text-[11px]">
                            📞 Phone: {order.contactNumber}
                          </p>
                        )}
                        {order.fbMessengerLink && (
                          <p className="mt-1">
                            <a
                              href={order.fbMessengerLink.startsWith('http') ? order.fbMessengerLink : `https://${order.fbMessengerLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]"
                            >
                              <span>💬 FB Messenger</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        )}
                        {order.notes && (
                          <p className="mt-2 text-gray-500 italic bg-white p-2 border border-gray-100 font-mono text-[11px]">
                            Notes: "{order.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
