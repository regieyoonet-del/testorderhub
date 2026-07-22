/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Order, CartItem } from '../types';
import { Calendar, RefreshCw, ChevronDown, ChevronUp, Clock, Package, CheckCircle2, Truck } from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  selectedCompanyName: string;
  onReorderPastOrder: (order: Order) => void;
  appsScriptUrl?: string;
}

export default function OrderHistory({
  orders,
  selectedCompanyName,
  onReorderPastOrder,
  appsScriptUrl
}: OrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  // Filter orders to only show the ones matching the selected active company
  const companyOrders = orders.filter(
    o => o.companyName.toLowerCase() === selectedCompanyName.toLowerCase()
  );

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
    const commonStyle = "text-[10px] font-mono uppercase px-2 py-0.5 border font-bold flex items-center gap-1 shrink-0";
    switch (status) {
      case 'Pending':
        return (
          <span className={`${commonStyle} bg-white text-gray-500 border-gray-300`}>
            <Clock className="w-3 h-3 text-gray-400" /> Pending Approval
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
        return <span className={`${commonStyle} bg-white text-gray-400 border-gray-200`}>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-black pb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">Order History</h2>
          <p className="text-xs text-gray-500 font-mono">
            Past repeating transactions for <span className="font-bold underline">{selectedCompanyName}</span>
          </p>
        </div>
        {appsScriptUrl && (
          <span className="text-[10px] font-mono text-gray-500 self-start sm:self-auto bg-gray-100 px-2 py-1 border border-gray-200">
            Synced with Google Sheets API
          </span>
        )}
      </div>

      {companyOrders.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-12 text-center space-y-3">
          <Package className="w-8 h-8 text-gray-300 mx-auto" />
          <h3 className="font-bold text-sm text-black uppercase tracking-tight">No Order Records Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            There are no past orders logged under {selectedCompanyName} yet. Try placing a new order from the catalog!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {companyOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

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
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formattedDate}
                      </span>
                      <span>·</span>
                      <span>By {order.contactPerson}</span>
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
                        onClick={() => handleReorderClick(order)}
                        className="bg-black text-white px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider hover:bg-white hover:text-black border border-black transition-colors flex items-center gap-1.5 cursor-pointer"
                        id={`reorder-past-btn-${order.id}`}
                      >
                        <RefreshCw className={`w-3 h-3 ${reorderedId === order.id ? 'animate-spin' : ''}`} />
                        <span>{reorderedId === order.id ? 'Loading...' : 'Fast Reorder'}</span>
                      </button>

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
                              <span className="text-xl p-1 bg-white border border-gray-200 w-8 h-8 flex items-center justify-center select-none">{item.imageUrl || '📦'}</span>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-gray-600">
                      <div>
                        <span className="font-bold text-black uppercase block text-[10px] font-mono">Shipping Address</span>
                        <p className="mt-1 leading-normal">{order.deliveryAddress}</p>
                      </div>
                      <div>
                        <span className="font-bold text-black uppercase block text-[10px] font-mono">Contact &amp; Delivery Details</span>
                        <p className="mt-1 leading-normal">
                          Receiver: {order.contactPerson} (<span className="underline">{order.contactEmail}</span>)
                        </p>
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
