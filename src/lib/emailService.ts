/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * B2B Email Notification and Sandbox Delivery Service
 */

import { Order, CompanyProfile, SystemSettings } from '../types';

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string; // HTML formatted
  sentAt: string;
  type: 'order_placement_client' | 'order_placement_admin' | 'status_change_client' | 'cancel_admin' | 'login_alert_client';
  realDelivered: boolean;
}

// Global state or localStorage tracker for simulated emails
const STORAGE_KEY = 'rp_simulated_emails';

export const emailService = {
  /**
   * Get all sent/simulated emails from localStorage log.
   */
  getEmailLogs(): EmailLog[] {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  },

  /**
   * Clear the email logs.
   */
  clearLogs(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Helper to write an email log and attempt real Apps Script sending if connected.
   */
  async queueAndSendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    type: EmailLog['type'];
    appsScriptUrl?: string;
  }): Promise<boolean> {
    const { to, subject, htmlBody, type, appsScriptUrl } = params;
    let realDelivered = false;

    // Sanitize recipient: replace dummy example.com with real fallback
    const targetEmail = (to && to.trim() !== '' && !to.includes('example.com'))
      ? to.trim()
      : 'regie.yoonet@gmail.com';

    // 1. Attempt real email delivery through Google Apps Script if connected
    if (appsScriptUrl) {
      try {
        const cleanedUrl = appsScriptUrl.trim();
        const payload = {
          action: 'sendEmail',
          to: targetEmail,
          subject: subject,
          body: htmlBody,
          isHtml: true
        };

        await fetch(cleanedUrl, {
          method: 'POST',
          mode: 'no-cors', // Standard Google webapp cors workaround
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload)
        });
        
        realDelivered = true;
        console.log(`[Email Service] Real email dispatched successfully through Apps Script to: ${targetEmail}`);
      } catch (e) {
        console.error('[Email Service] Failed sending real email via Apps Script:', e);
      }
    }

    // 2. Persist in local Sandbox logs so the user can inspect templates in browser
    const newLog: EmailLog = {
      id: `mail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to: targetEmail,
      subject,
      body: htmlBody,
      sentAt: new Date().toISOString(),
      type,
      realDelivered
    };

    const logs = this.getEmailLogs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newLog, ...logs]));

    // Dispatch a custom event so components can automatically refresh the sandbox view
    window.dispatchEvent(new Event('rp_emails_updated'));

    return true;
  },

  /**
   * Email 1: Automated Receipt to Company upon successful order placement.
   */
  async sendOrderPlacementClientEmail(
    order: Order,
    company: CompanyProfile,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const currency = settings.currencySymbol || 'Php';
    const recipient = (order.contactEmail && !order.contactEmail.includes('example.com'))
      ? order.contactEmail
      : ((company.contactEmail && !company.contactEmail.includes('example.com')) ? company.contactEmail : 'regie.yoonet@gmail.com');

    const itemsRows = order.items.map(item => {
      const specList = Object.entries(item.customDetails || {})
        .map(([k, v]) => `• <strong>${k}:</strong> ${v}`)
        .join('<br/>');

      const sizeStr = item.selectedSize ? `<br/>Size: ${item.selectedSize}` : '';
      const colStr = item.selectedColor ? `<br/>Color: ${item.selectedColor}` : '';

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1f2937;">
            <strong style="color: #000000;">${item.productName}</strong>
            <span style="font-size: 11px; color: #6b7280; display: block; font-family: monospace; margin-top: 4px;">
              ${sizeStr}${colStr}${specList ? '<br/>' + specList : ''}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1f2937; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1f2937; text-align: right;">
            ${currency} ${item.price.toFixed(2)}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #000000; font-weight: bold; text-align: right;">
            ${currency} ${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = Math.max(0, order.totalAmount - subtotal);

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000000; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; display: block; margin-bottom: 4px;">B2B Client Receipt</span>
          <h1 style="font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; tracking-tight;">${hubName}</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Order Confirmed: ${order.orderNumber}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">Dear <strong>${order.contactPerson || company.contactPerson}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          Thank you for your order! Your corporate branded specifications are approved and have been queued for processing. Below is your detailed purchase receipt:
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #000000; padding: 16px; font-family: monospace; font-size: 11px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 4px; color: #6b7280; text-transform: uppercase;">Company Account:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${company.name}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #6b7280; text-transform: uppercase;">Purchase Order (PO):</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${order.poNumber || 'N/A (B2B Billing Authorized)'}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #6b7280; text-transform: uppercase;">Delivery Address:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${order.deliveryAddress}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #6b7280; text-transform: uppercase;">Turnaround Lead-Time:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000; text-transform: uppercase;">Standard Queue</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px 12px; border-bottom: 2px solid #000000; text-align: left; font-size: 11px; font-family: monospace; text-transform: uppercase;">Item Description</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #000000; text-align: center; font-size: 11px; font-family: monospace; text-transform: uppercase; width: 60px;">Qty</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #000000; text-align: right; font-size: 11px; font-family: monospace; text-transform: uppercase; width: 80px;">Unit Price</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #000000; text-align: right; font-size: 11px; font-family: monospace; text-transform: uppercase; width: 90px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="width: 250px; margin-left: auto; margin-bottom: 24px; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #4b5563;">Items Subtotal:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace;">${currency} ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Shipping &amp; Logistics:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${shipping === 0 ? 'FREE' : `${currency} ${shipping.toFixed(2)}`}</td>
            </tr>
            <tr style="font-weight: 900; font-size: 15px;">
              <td style="padding: 10px 0; color: #000000;">Total Billing Amount:</td>
              <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #000000;">${currency} ${order.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; text-align: center; font-family: monospace; line-height: 1.4;">
          This is an automated notification sent to the approved corporate buyer for ${company.name}. If you did not place this order, please notify the Hub Admin immediately.
        </div>
      </div>
    `;

    return this.queueAndSendEmail({
      to: recipient,
      subject: `Order Confirmed: ${order.orderNumber} - ${company.name}`,
      htmlBody,
      type: 'order_placement_client',
      appsScriptUrl
    });
  },

  /**
   * Email 2: Automated Alert to Admin upon successful order placement.
   */
  async sendOrderPlacementAdminEmail(
    order: Order,
    company: CompanyProfile,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const currency = settings.currencySymbol || 'Php';
    const recipient = (settings.adminEmail && !settings.adminEmail.includes('example.com'))
      ? settings.adminEmail
      : 'regie.yoonet@gmail.com';

    const itemsSummaryList = order.items.map(item => {
      const options = [
        item.selectedSize ? `Size: ${item.selectedSize}` : '',
        item.selectedColor ? `Color: ${item.selectedColor}` : ''
      ].filter(Boolean).join(', ');
      
      return `<li><strong>${item.productName}</strong> x ${item.quantity} ${options ? `(${options})` : ''}</li>`;
    }).join('');

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #ef4444; display: block; font-weight: bold; margin-bottom: 4px;">🚨 NEW ORDER INCOMING</span>
          <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; color: #000000;">${hubName} Admin</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Sheet Registered Order: ${order.orderNumber}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; font-weight: bold;">Attention Administrator,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          A new B2B corporate procurement order has been logged! Please review and verify the branding specifications, sizes, and print layouts in the admin spreadsheet dashboard.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 16px; font-family: monospace; font-size: 12px; margin-bottom: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Client Account:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${company.name}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Representative:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${order.contactPerson} (${order.contactEmail})</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">B2B PO Number:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${order.poNumber || 'N/A (B2B Billing Authorized)'}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Grand Total:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: 800; color: #b91c1c; font-size: 14px;">${currency} ${order.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; font-size: 13px; text-transform: uppercase; font-family: monospace; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; color: #000000;">Ordered Catalog Items:</h3>
          <ul style="padding-left: 20px; font-size: 13px; line-height: 1.6; margin-bottom: 0; color: #374151;">
            ${itemsSummaryList}
          </ul>
        </div>

        ${order.notes ? `
          <div style="background-color: #fafafa; border-left: 3px solid #6b7280; padding: 10px 12px; margin-bottom: 20px; font-size: 12px; font-style: italic; color: #4b5563;">
            "Customer notes: ${order.notes}"
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="font-size: 11px; color: #6b7280; font-family: monospace;">
            This order has been synchronized with your live Google Spreadsheet.
          </p>
        </div>
      </div>
    `;

    return this.queueAndSendEmail({
      to: recipient,
      subject: `🚨 [NEW ORDER] ${order.orderNumber} - ${company.name}`,
      htmlBody,
      type: 'order_placement_admin',
      appsScriptUrl
    });
  },

  /**
   * Email 3: Automated Email when an order status is changed.
   */
  async sendOrderStatusChangedEmail(
    order: Order,
    company: CompanyProfile,
    oldStatus: string,
    newStatus: string,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const recipient = (order.contactEmail && !order.contactEmail.includes('example.com'))
      ? order.contactEmail
      : ((company.contactEmail && !company.contactEmail.includes('example.com')) ? company.contactEmail : 'regie.yoonet@gmail.com');
    
    // Determine user-friendly color/details based on status
    let statusColor = '#3b82f6'; // Blue for pending / production
    let statusMessage = 'has been updated in our B2B production workflow.';
    let timelineMessage = 'Our technicians are working diligently to build your corporate branding.';

    if (newStatus === 'In Production') {
      statusColor = '#f59e0b'; // Orange
      statusMessage = 'is now officially **IN PRODUCTION**!';
      timelineMessage = 'Materials have been allocated and our print/embroidery queue is currently processing your specifications.';
    } else if (newStatus === 'Shipped') {
      statusColor = '#10b981'; // Green
      statusMessage = 'has been **SHIPPED & DISPATCHED**!';
      timelineMessage = 'Your package is on its way to your designated corporate delivery address! Tracking and details have been logged.';
    } else if (newStatus === 'Completed') {
      statusColor = '#111827'; // Dark
      statusMessage = 'is now marked as **COMPLETED**!';
      timelineMessage = 'Your corporate branded items have been successfully delivered and B2B catalog records archived.';
    } else if (newStatus === 'Canceled') {
      statusColor = '#ef4444'; // Red
      statusMessage = 'has been **CANCELED**.';
      timelineMessage = 'This order has been canceled. B2B billing allocations and purchase orders for this batch have been voided.';
    }

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid ${statusColor}; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid ${statusColor}; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; display: block; margin-bottom: 4px;">Status Update Notification</span>
          <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; color: ${statusColor};">${newStatus}</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Order: ${order.orderNumber}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">Dear <strong>${order.contactPerson || company.contactPerson}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          The status of your procurement order <strong>${order.orderNumber}</strong> ${statusMessage}
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">PREVIOUS STATUS:</td>
              <td style="padding: 4px 0; text-align: right; text-decoration: line-through; color: #9ca3af; font-weight: bold;">${oldStatus}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #000000; font-weight: bold;">CURRENT WORKFLOW:</td>
              <td style="padding: 4px 0; text-align: right; color: ${statusColor}; font-weight: 900; font-size: 13px;">${newStatus}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">DELIVERY ADDRESS:</td>
              <td style="padding: 4px 0; text-align: right; color: #000000; font-weight: bold;">${order.deliveryAddress}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #4b5563; background-color: #fafafa; border-left: 3px solid ${statusColor}; padding: 10px 12px; border-radius: 0 4px 4px 0;">
          <strong>Timeline Note:</strong> ${timelineMessage}
        </p>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 24px;">
          You can track the ongoing progress or view the full specifications by signing into your corporate B2B catalog portal.
        </p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #6b7280; text-align: center; font-family: monospace;">
          Thank you for choosing ${hubName} for your brand-approved specifications.
        </div>
      </div>
    `;

    return this.queueAndSendEmail({
      to: recipient,
      subject: `[Status: ${newStatus}] Order ${order.orderNumber} - ${company.name}`,
      htmlBody,
      type: 'status_change_client',
      appsScriptUrl
    });
  },

  /**
   * Email 4: Automated Admin Notification when order is canceled.
   */
  async sendOrderCancelAdminEmail(
    order: Order,
    company: CompanyProfile,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const currency = settings.currencySymbol || 'Php';
    const recipient = (settings.adminEmail && !settings.adminEmail.includes('example.com'))
      ? settings.adminEmail
      : 'regie.yoonet@gmail.com';

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #ef4444; display: block; font-weight: bold; margin-bottom: 4px;">⚠️ ORDER CANCELED</span>
          <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; color: #b91c1c;">${hubName} Cancellation</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Order: ${order.orderNumber}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; font-weight: bold;">Attention Hub Administrator,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          Please note that the corporate order <strong>${order.orderNumber}</strong> placed by <strong>${company.name}</strong> has been marked as <strong>CANCELED</strong>.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 16px; font-family: monospace; font-size: 12px; margin-bottom: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Client Account:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${company.name}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Purchase Order (PO):</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${order.poNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Canceled Amount:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #b91c1c;">${currency} ${order.totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 4px; color: #7f1d1d; font-weight: bold;">Canceled On:</td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: bold; color: #000000;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #4b5563;">
          This cancel event has been synchronised with the database sheet. Please review outstanding B2B billing adjustments as necessary.
        </p>
      </div>
    `;

    return this.queueAndSendEmail({
      to: recipient,
      subject: `⚠️ [CANCELED] ${order.orderNumber} - ${company.name}`,
      htmlBody,
      type: 'cancel_admin',
      appsScriptUrl
    });
  },

  /**
   * Email 5: Security Alert to Company on new device login.
   */
  async sendNewDeviceLoginEmail(
    company: CompanyProfile,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const recipient = (company.contactEmail && !company.contactEmail.includes('example.com'))
      ? company.contactEmail
      : 'regie.yoonet@gmail.com';
    const timestamp = new Date().toLocaleString();
    
    // Parse simplified user agent details
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown Operating System';
    
    if (ua.indexOf('Chrome') > -1) browser = 'Google Chrome';
    else if (ua.indexOf('Firefox') > -1) browser = 'Mozilla Firefox';
    else if (ua.indexOf('Safari') > -1) browser = 'Apple Safari';
    else if (ua.indexOf('Edge') > -1) browser = 'Microsoft Edge';

    if (ua.indexOf('Windows') > -1) os = 'Windows OS';
    else if (ua.indexOf('Macintosh') > -1) os = 'macOS';
    else if (ua.indexOf('iPhone') > -1) os = 'iOS (iPhone)';
    else if (ua.indexOf('Android') > -1) os = 'Android OS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux OS';

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000000; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #ef4444; display: block; font-weight: bold; margin-bottom: 4px;">🔐 SECURITY SESSION ALERT</span>
          <h1 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase;">PORTAL SIGN-IN</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Device Verification</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">Dear <strong>${company.contactPerson}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          This is an automated security alert to notify you that your approved corporate representative signed into your brand's **${hubName} B2B Portal** from a new browser/device.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #000000; padding: 16px; font-family: monospace; font-size: 12px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">B2B ACCOUNT:</td>
              <td style="padding: 4px 0; text-align: right; color: #000000; font-weight: bold;">${company.name}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">TIME STAMP:</td>
              <td style="padding: 4px 0; text-align: right; color: #000000; font-weight: bold;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">DEVICE OS:</td>
              <td style="padding: 4px 0; text-align: right; color: #000000; font-weight: bold;">${os}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">BROWSER TYPE:</td>
              <td style="padding: 4px 0; text-align: right; color: #000000; font-weight: bold;">${browser}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 12px; font-size: 12px; line-height: 1.4; border-radius: 4px; margin-bottom: 20px;">
          <strong>Security Action Required:</strong> If this sign-in was authorized by your brand representatives, no action is needed. If you do not recognize this login activity, please contact your account manager at ${hubName} immediately to update your secret passcode credentials.
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; text-align: center; font-family: monospace;">
          This is a system safety alert from ${hubName}.
        </div>
      </div>
    `;

    return this.queueAndSendEmail({
      to: recipient,
      subject: `🔐 Security Alert: New Login Session for ${company.name}`,
      htmlBody,
      type: 'login_alert_client',
      appsScriptUrl
    });
  },

  /**
   * Helper method to send a test automated email notification to any designated target email address.
   */
  async sendTestEmail(
    targetEmail: string,
    settings: SystemSettings,
    appsScriptUrl?: string
  ): Promise<boolean> {
    const hubName = settings.hubName || 'ARH Print Hub';
    const timestamp = new Date().toLocaleString();

    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #10b981; padding: 24px; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; display: block; font-weight: bold; margin-bottom: 4px;">✅ AUTOMATED EMAIL SYSTEM TEST</span>
          <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; color: #000000;">${hubName} Email Verification</h1>
          <p style="font-size: 12px; color: #4b5563; font-family: monospace; margin-top: 4px; margin-bottom: 0;">Dispatched: ${timestamp}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; font-weight: bold;">Hello Administrator / Client,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          This is an automated test email confirming that your email notification pipeline and Google Apps Script integration are working properly!
        </p>

        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; font-family: monospace; font-size: 12px; margin-bottom: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #065f46; font-weight: bold;">DESTINATION EMAIL:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #000000;">${targetEmail}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #065f46; font-weight: bold;">APPS SCRIPT STATUS:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #059669;">${appsScriptUrl ? 'CONNECTED & ACTIVE' : 'SANDBOX / LOCAL LOGGED'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #065f46; font-weight: bold;">HUB NAME:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #000000;">${hubName}</td>
            </tr>
          </table>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; text-align: center; font-family: monospace;">
          Automated Email Pipeline Verified.
        </div>
      </div>
    `;

    return this.queueAndSendEmail({
      to: targetEmail,
      subject: `✅ [TEST EMAIL] ${hubName} Automated Notification System`,
      htmlBody,
      type: 'order_placement_admin',
      appsScriptUrl
    });
  }
};
