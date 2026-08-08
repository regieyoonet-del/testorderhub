/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2, ShoppingBag, RefreshCw, Package, X, Clock, FileText, FileCheck } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationBellProps {
  userRole: 'admin' | 'client';
  companyName?: string;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export default function NotificationBell({
  userRole,
  companyName,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter notifications for current perspective
  const userNotifications = useMemo(() => {
    if (userRole === 'admin') {
      return notifications.filter(n => n.recipientType === 'admin');
    } else {
      const activeCoLower = companyName?.trim().toLowerCase();
      if (!activeCoLower) return [];
      return notifications.filter(
        n => n.recipientType === 'company' && n.companyName && n.companyName.trim().toLowerCase() === activeCoLower
      );
    }
  }, [notifications, userRole, companyName]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_storefront_order':
        return <ShoppingBag className="w-4 h-4 text-amber-600" />;
      case 'order_status_change':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'new_company_order':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'quote_request':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'quote_status_change':
        return <FileCheck className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative border border-black bg-white p-2.5 text-black hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 rounded-xl"
        aria-label="Notifications"
        title="Notifications"
        id="notification-bell-btn"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-mono border border-white font-extrabold px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-black font-mono">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-black text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[10px] font-mono font-bold uppercase text-gray-600 hover:text-black hover:bg-gray-200 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                  id="notif-mark-all-read-btn"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-black p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-gray-100 flex-1 custom-scrollbar">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase">
                  No notifications
                </p>
                <p className="text-[11px] text-gray-400">
                  {userRole === 'admin'
                    ? 'You will be notified when companies submit new orders.'
                    : 'You will be notified when storefront orders arrive or order statuses update.'}
                </p>
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) {
                      onMarkAsRead(notif.id);
                    }
                    if (onSelectNotification) {
                      onSelectNotification(notif);
                    }
                    setIsOpen(false);
                  }}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-gray-50 ${
                    notif.read ? 'bg-white opacity-80' : 'bg-blue-50/50 hover:bg-blue-50 font-medium'
                  }`}
                  id={`notif-item-${notif.id}`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    notif.read ? 'bg-gray-100' : 'bg-white shadow-xs border border-gray-200'
                  }`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs uppercase tracking-tight truncate ${
                        notif.read ? 'font-bold text-gray-700' : 'font-extrabold text-black'
                      }`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 text-[10px] text-gray-400 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatTimestamp(notif.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug break-words">
                      {notif.message}
                    </p>

                    {notif.orderNumber && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-mono font-bold text-gray-700">
                        {notif.orderNumber}
                      </span>
                    )}
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" title="Unread" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {userNotifications.length > 0 && (
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2 shrink-0 text-xs">
              <span className="text-[10px] font-mono text-gray-500 pl-2">
                Showing {userNotifications.length} notification{userNotifications.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={onClearAll}
                className="text-[10px] font-mono font-bold uppercase text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                id="notif-clear-all-btn"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
