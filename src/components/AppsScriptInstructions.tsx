/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clipboard, Check, HelpCircle, FileText, Database } from 'lucide-react';

export default function AppsScriptInstructions() {
  const [copied, setCopied] = useState(false);

  const appsScriptCode = `/**
 * Google Apps Script for ARH Print Hub Backend
 * 
 * Instructions:
 * 1. Open a Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New deployment.
 * 6. Select Type: Web app.
 * 7. Set Description: "ARH Print Backend"
 * 8. Set Execute as: "Me" (your email)
 * 9. Set Who has access: "Anyone"
 * 10. Click Deploy, authorize permissions, and copy the Web App URL.
 * 11. Paste that Web App URL in the Settings tab of this app.
 */

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create sheets if they do not exist
  initSheets(sheet);
  
  if (action === "getAllData" || action === "syncAll" || action === "getInitialData") {
    var adminData = getTableData(sheet, "Admin");
    return getJsonOutput({
      status: "success",
      products: getTableData(sheet, "Products"),
      catalogProducts: getTableData(sheet, "CatalogProducts"),
      quotes: getTableData(sheet, "Quotes"),
      companies: getTableData(sheet, "Companies"),
      portals: getTableData(sheet, "Portals"),
      orders: getOrdersWithItems(sheet),
      adminSettings: adminData.length > 0 ? adminData[0] : {},
      notifications: getTableData(sheet, "Notifications"),
      jobs: getTableData(sheet, "Jobs"),
      jobColumns: getTableData(sheet, "JobColumns"),
      jobItemColumns: getTableData(sheet, "JobItemColumns"),
      staff: getTableData(sheet, "Staff"),
      staffAccounts: getTableData(sheet, "StaffAccounts"),
      attendance: getTableData(sheet, "Attendance"),
      payroll: getTableData(sheet, "Payroll"),
      expenses: getTableData(sheet, "Expenses"),
      expenseCategories: getTableData(sheet, "ExpenseCategories"),
      recurringExpenses: getTableData(sheet, "RecurringExpenses")
    });
  }

  if (action === "getProducts") {
    return getJsonOutput(getTableData(sheet, "Products"));
  }

  if (action === "getCatalogProducts") {
    return getJsonOutput(getTableData(sheet, "CatalogProducts"));
  }

  if (action === "getQuoteEnquiries") {
    return getJsonOutput(getTableData(sheet, "Quotes"));
  }
  
  if (action === "getCompanies") {
    return getJsonOutput(getTableData(sheet, "Companies"));
  }

  if (action === "getPortals") {
    return getJsonOutput(getTableData(sheet, "Portals"));
  }
  
  if (action === "getOrders") {
    return getJsonOutput(getOrdersWithItems(sheet));
  }

  if (action === "getAdminSettings") {
    var adminData = getTableData(sheet, "Admin");
    return getJsonOutput(adminData.length > 0 ? adminData[0] : {});
  }

  if (action === "getNotifications") {
    return getJsonOutput(getTableData(sheet, "Notifications"));
  }

  if (action === "getJobs") {
    return getJsonOutput(getTableData(sheet, "Jobs"));
  }

  if (action === "getJobColumns") {
    return getJsonOutput(getTableData(sheet, "JobColumns"));
  }

  if (action === "getJobItemColumns") {
    return getJsonOutput(getTableData(sheet, "JobItemColumns"));
  }

  if (action === "getStaff") {
    return getJsonOutput(getTableData(sheet, "Staff"));
  }

  if (action === "getStaffAccounts") {
    return getJsonOutput(getTableData(sheet, "StaffAccounts"));
  }

  if (action === "getAttendance") {
    return getJsonOutput(getTableData(sheet, "Attendance"));
  }

  if (action === "getPayroll") {
    return getJsonOutput(getTableData(sheet, "Payroll"));
  }

  if (action === "getExpenses") {
    return getJsonOutput(getTableData(sheet, "Expenses"));
  }

  if (action === "getExpenseCategories") {
    return getJsonOutput(getTableData(sheet, "ExpenseCategories"));
  }

  if (action === "getRecurringExpenses") {
    return getJsonOutput(getTableData(sheet, "RecurringExpenses"));
  }
  
  return getJsonOutput({ status: "success", message: "ARH Print Apps Script is active" });
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  initSheets(sheet);
  
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return getJsonOutput({ status: "error", message: "Invalid JSON format" });
  }
  
  if (payload.action === "createOrder") {
    return getJsonOutput(saveNewOrder(sheet, payload.order));
  }
  
  if (payload.action === "saveProduct") {
    return getJsonOutput(saveProduct(sheet, payload.product));
  }

  if (payload.action === "saveCatalogProduct") {
    return getJsonOutput(saveCatalogProduct(sheet, payload.product));
  }

  if (payload.action === "deleteCatalogProduct") {
    return getJsonOutput(deleteRowById(sheet, "CatalogProducts", "Product ID", payload.productId));
  }

  if (payload.action === "saveQuoteEnquiry") {
    return getJsonOutput(saveQuoteEnquiry(sheet, payload.enquiry));
  }

  if (payload.action === "deleteQuoteEnquiry") {
    return getJsonOutput(deleteRowById(sheet, "Quotes", "Enquiry ID", payload.enquiryId));
  }

  if (payload.action === "updateQuoteEnquiryStatus") {
    return getJsonOutput(updateQuoteEnquiryStatus(sheet, payload.enquiryId, payload.status));
  }
  
  if (payload.action === "deleteProduct") {
    return getJsonOutput(deleteRowById(sheet, "Products", "Product ID", payload.productId));
  }
  
  if (payload.action === "saveCompany") {
    return getJsonOutput(saveCompany(sheet, payload.company));
  }
  
  if (payload.action === "deleteCompany") {
    return getJsonOutput(deleteRowById(sheet, "Companies", "Company ID", payload.companyId));
  }

  if (payload.action === "savePortal") {
    return getJsonOutput(savePortal(sheet, payload.portal));
  }

  if (payload.action === "deletePortal") {
    return getJsonOutput(deleteRowById(sheet, "Portals", "Portal ID", payload.portalId));
  }

  if (payload.action === "deleteOrder") {
    return getJsonOutput(deleteOrder(sheet, payload.orderId));
  }

  if (payload.action === "updateOrderStatus") {
    return getJsonOutput(updateOrderStatus(sheet, payload.orderId, payload.status));
  }

  if (payload.action === "saveAdminSettings") {
    return getJsonOutput(saveAdminSettings(sheet, payload.settings, payload.adminUsername, payload.adminPasscode));
  }

  if (payload.action === "saveNotification") {
    return getJsonOutput(saveNotification(sheet, payload.notification));
  }

  if (payload.action === "saveNotifications") {
    return getJsonOutput(saveNotifications(sheet, payload.notifications));
  }

  if (payload.action === "markNotificationRead") {
    return getJsonOutput(markNotificationRead(sheet, payload.notifId));
  }

  if (payload.action === "clearNotifications") {
    return getJsonOutput(clearNotifications(sheet));
  }

  if (payload.action === "saveJob") {
    return getJsonOutput(saveJob(sheet, payload.job));
  }

  if (payload.action === "saveJobsBatch") {
    return getJsonOutput(saveJobsBatch(sheet, payload.jobs));
  }

  if (payload.action === "deleteJob") {
    return getJsonOutput(deleteRowById(sheet, "Jobs", "Job ID", payload.jobId));
  }

  if (payload.action === "updateJobStatus") {
    return getJsonOutput(updateJobStatus(sheet, payload.jobId, payload.status));
  }

  if (payload.action === "saveJobColumns") {
    return getJsonOutput(saveJobColumns(sheet, payload.columns));
  }

  if (payload.action === "saveJobItemColumns") {
    return getJsonOutput(saveJobItemColumns(sheet, payload.columns));
  }

  if (payload.action === "cleanDuplicateColumns") {
    cleanDuplicateColumns(sheet);
    return getJsonOutput({ status: "success", message: "Duplicate columns cleaned" });
  }

  if (payload.action === "saveStaff") {
    return getJsonOutput(saveStaff(sheet, payload.staff));
  }

  if (payload.action === "saveStaffBatch") {
    return getJsonOutput(saveStaffBatch(sheet, payload.staffMembers));
  }

  if (payload.action === "deleteStaff") {
    return getJsonOutput(deleteRowById(sheet, "Staff", "Staff ID", payload.staffId));
  }

  if (payload.action === "saveStaffAccount") {
    return getJsonOutput(saveStaffAccount(sheet, payload.account));
  }

  if (payload.action === "saveStaffAccountsBatch") {
    return getJsonOutput(saveStaffAccountsBatch(sheet, payload.accounts));
  }

  if (payload.action === "deleteStaffAccount") {
    return getJsonOutput(deleteRowById(sheet, "StaffAccounts", "Account ID", payload.accountId));
  }

  if (payload.action === "saveAttendance") {
    return getJsonOutput(saveAttendance(sheet, payload.record));
  }

  if (payload.action === "saveAttendanceBatch") {
    return getJsonOutput(saveAttendanceBatch(sheet, payload.records));
  }

  if (payload.action === "deleteAttendance") {
    return getJsonOutput(deleteRowById(sheet, "Attendance", "Attendance ID", payload.attendanceId));
  }

  if (payload.action === "savePayroll") {
    return getJsonOutput(savePayroll(sheet, payload.record));
  }

  if (payload.action === "savePayrollBatch") {
    return getJsonOutput(savePayrollBatch(sheet, payload.records));
  }

  if (payload.action === "deletePayroll") {
    return getJsonOutput(deleteRowById(sheet, "Payroll", "Payroll ID", payload.payrollId));
  }

  if (payload.action === "saveExpense") {
    return getJsonOutput(saveExpense(sheet, payload.expense));
  }

  if (payload.action === "saveExpensesBatch") {
    return getJsonOutput(saveExpensesBatch(sheet, payload.expenses));
  }

  if (payload.action === "deleteExpense") {
    return getJsonOutput(deleteRowById(sheet, "Expenses", "Expense ID", payload.expenseId));
  }

  if (payload.action === "saveExpenseCategories") {
    return getJsonOutput(saveExpenseCategories(sheet, payload.categories));
  }

  if (payload.action === "saveRecurringExpense") {
    return getJsonOutput(saveRecurringExpense(sheet, payload.rule));
  }

  if (payload.action === "saveRecurringExpensesBatch") {
    return getJsonOutput(saveRecurringExpensesBatch(sheet, payload.rules));
  }

  if (payload.action === "deleteRecurringExpense") {
    return getJsonOutput(deleteRowById(sheet, "RecurringExpenses", "Recurring Expense ID", payload.ruleId));
  }
  
  return getJsonOutput({ status: "error", message: "Unknown action" });
}

function ensureHeaders(sheet, expectedHeaders) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var updated = false;
  
  function getNormalized(str) {
    if (!str) return "";
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  
  var normalizedExisting = [];
  for (var k = 0; k < headers.length; k++) {
    normalizedExisting.push(getNormalized(headers[k]));
  }
  
  for (var i = 0; i < expectedHeaders.length; i++) {
    var expected = expectedHeaders[i];
    var normExpected = getNormalized(expected);
    
    if (normalizedExisting.indexOf(normExpected) === -1) {
      // Append missing header
      sheet.getRange(1, headers.length + 1).setValue(expected)
        .setFontWeight("bold")
        .setBackground("#f3f4f6");
      headers.push(expected);
      normalizedExisting.push(normExpected);
      updated = true;
    }
  }
  if (updated) {
    data = sheet.getDataRange().getValues();
  }
  return data;
}

function getMapValueByHeader(map, header) {
  var normHeader = header.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (normHeader === "username") {
    if (map.hasOwnProperty("Username")) return map["Username"];
    if (map.hasOwnProperty("User Name")) return map["User Name"];
  }
  if (normHeader === "passcode") {
    if (map.hasOwnProperty("Passcode")) return map["Passcode"];
    if (map.hasOwnProperty("Pass Code")) return map["Pass Code"];
    if (map.hasOwnProperty("Password")) return map["Password"];
  }
  if (normHeader === "applogourl" || normHeader === "logourl") {
    if (map.hasOwnProperty("App Logo URL")) return map["App Logo URL"];
    if (map.hasOwnProperty("Logo URL")) return map["Logo URL"];
    if (map.hasOwnProperty("LogoUrl")) return map["LogoUrl"];
  }
  if (normHeader === "appfaviconurl" || normHeader === "faviconurl" || normHeader === "favicon") {
    if (map.hasOwnProperty("App Favicon URL")) return map["App Favicon URL"];
    if (map.hasOwnProperty("Favicon URL")) return map["Favicon URL"];
    if (map.hasOwnProperty("FaviconUrl")) return map["FaviconUrl"];
    if (map.hasOwnProperty("Favicon")) return map["Favicon"];
  }
  if (normHeader === "brandingmethods" || normHeader === "brandingmethod" || normHeader === "branding") {
    if (map.hasOwnProperty("Branding Methods")) return map["Branding Methods"];
    if (map.hasOwnProperty("Branding Method")) return map["Branding Method"];
    if (map.hasOwnProperty("Branding")) return map["Branding"];
  }
  if (normHeader === "colors" || normHeader === "colours" || normHeader === "color" || normHeader === "colour" || normHeader === "coloroptions" || normHeader === "colouroptions") {
    if (map.hasOwnProperty("Colors")) return map["Colors"];
    if (map.hasOwnProperty("Colours")) return map["Colours"];
    if (map.hasOwnProperty("Color")) return map["Color"];
    if (map.hasOwnProperty("Colour")) return map["Colour"];
  }
  
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      var normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normKey === normHeader) {
        return map[key];
      }
    }
  }
  return "";
}

function initSheets(ss) {
  var sheets = ["Orders", "OrderItems", "Products", "CatalogProducts", "Companies", "Portals", "Admin", "Quotes", "Notifications", "Jobs", "JobColumns", "JobItemColumns", "Staff", "StaffAccounts", "Attendance", "Payroll", "Expenses", "ExpenseCategories", "RecurringExpenses"];
  
  // Headers definitions
  var headers = {
    "Orders": ["Order ID", "Order Number", "Company Name", "Contact Email", "Contact Person", "Contact Number", "FB Messenger Link", "Delivery Address", "PO Number", "Total Amount", "Status", "Created At", "Notes", "Portal ID", "Portal Name"],
    "OrderItems": ["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details", "Selected Add-Ons"],
    "Products": ["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered", "Shipping Fee", "Image URLs", "Custom Fields", "Add-Ons"],
    "CatalogProducts": ["Product ID", "SKU", "Name", "Category", "Description", "Image URL", "Image URLs", "MOQ", "Lead Time", "Branding Methods", "Colors", "Sizes", "Status"],
    "Companies": ["Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Delivery Address", "Username", "Passcode", "PO Required", "Logo URL", "Approved Products", "Custom Products"],
    "Portals": ["Portal ID", "Company ID", "Company Name", "Portal Name", "Description", "Status", "Product IDs", "Portal Pricing", "Variant Pricing", "Created At", "Updated At", "Share Token"],
    "Admin": ["Hub Name", "Short Hub Name", "Company Tagline", "Company Address", "Tax TIN ID", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme", "Admin Email", "App Logo URL", "App Favicon URL"],
    "Quotes": ["Enquiry ID", "Enquiry Number", "Product ID", "Product Name", "Product Category", "Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Quantity", "Preferred Branding Method", "Preferred Color", "Preferred Size", "Notes", "Status", "Created At", "Quoted Unit Price", "Quoted Total Price", "Quoted Tax", "Quoted Shipping", "Quote Notes", "Quoted Valid Until", "Quoted At", "Quoted Line Items", "Requested Product Addition", "Requested Product Addition At", "Requested Product Notes"],
    "Notifications": ["Notification ID", "Recipient Type", "Company Name", "Title", "Message", "Timestamp", "Read", "Order ID", "Order Number", "Type"],
    "Jobs": ["Job ID", "Company ID", "Company Name", "Order ID", "Order Number", "Source", "Status", "Position", "Values JSON", "Items JSON", "Activities JSON", "Created At", "Updated At", "Created By"],
    "JobColumns": ["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Options", "Created Date"],
    "JobItemColumns": ["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Calculation", "Options"],
    "Staff": ["Staff ID", "Full Name", "Position", "Department", "Employment Status", "Date Started", "Salary Type", "Basic Salary", "Allowances", "Other Compensation", "Notes", "Status", "Created At", "Updated At"],
    "StaffAccounts": ["Account ID", "Staff ID", "Name", "Username", "Passcode", "Role", "Status", "Email", "Phone", "Avatar URL", "Last Login", "Created At", "Updated At"],
    "Attendance": ["Attendance ID", "Staff ID", "Staff Name", "Date", "Clock In", "Clock Out", "Total Hours", "Status", "Notes", "Created At", "Updated At"],
    "Payroll": ["Payroll ID", "Staff ID", "Staff Name", "Position", "Department", "Pay Period Start", "Pay Period End", "Pay Date", "Basic Pay", "Allowances", "Other Earnings", "Gross Pay", "Deductions", "Itemized Deductions JSON", "Total Deductions", "Net Pay", "Status", "Notes", "Created At", "Updated At"],
    "Expenses": ["Expense ID", "Expense Name", "Category", "Expense Type", "Amount", "Expense Date", "Payment Status", "Payment Date", "Vendor", "Reference Number", "Notes", "Recurring Expense ID", "Payroll ID", "Created At", "Updated At"],
    "ExpenseCategories": ["Category ID", "Name", "Is System", "Status"],
    "RecurringExpenses": ["Recurring Expense ID", "Expense Name", "Category", "Amount", "Frequency", "Start Date", "End Date", "Payments Per Year", "Specific Months JSON", "Status", "Notes", "Created At", "Updated At"]
  };
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i];
    var s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      s.appendRow(headers[name]);
      s.getRange(1, 1, 1, headers[name].length).setFontWeight("bold").setBackground("#f3f4f6");
    } else {
      ensureHeaders(s, headers[name]);
    }
  }

  // Seed default column definitions if JobColumns / JobItemColumns have no data rows
  seedDefaultJobColumns(ss);
  seedDefaultJobItemColumns(ss);

  // Seed default expense categories if ExpenseCategories has no data rows
  seedDefaultExpenseCategories(ss);

  // Clean any historical duplicate rows in JobColumns / JobItemColumns
  cleanDuplicateColumns(ss);
}

function seedDefaultExpenseCategories(ss) {
  var sheet = ss.getSheetByName("ExpenseCategories");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) return;

  var defaultCats = [
    { id: "cat-rent", name: "Rent & Facilities", isSystem: true, status: "Active" },
    { id: "cat-utilities", name: "Utilities (Power / Water / Internet)", isSystem: true, status: "Active" },
    { id: "cat-salaries", name: "Salaries & Payroll", isSystem: true, status: "Active" },
    { id: "cat-materials", name: "Raw Materials & Inks", isSystem: true, status: "Active" },
    { id: "cat-maintenance", name: "Equipment & Maintenance", isSystem: true, status: "Active" },
    { id: "cat-software", name: "Software & Subscriptions", isSystem: true, status: "Active" },
    { id: "cat-marketing", name: "Marketing & Advertising", isSystem: true, status: "Active" },
    { id: "cat-logistics", name: "Logistics & Delivery", isSystem: true, status: "Active" },
    { id: "cat-taxes", name: "Taxes & Licenses", isSystem: true, status: "Active" },
    { id: "cat-misc", name: "Miscellaneous", isSystem: true, status: "Active" }
  ];
  saveExpenseCategories(ss, defaultCats);
}

function cleanDuplicateColumns(ss) {
  var jobColsSheet = ss.getSheetByName("JobColumns");
  if (jobColsSheet && jobColsSheet.getLastRow() > 1) {
    var rawData = getTableData(ss, "JobColumns");
    if (Array.isArray(rawData) && rawData.length > 0) {
      var uniqueMap = {};
      var uniqueList = [];
      for (var i = 0; i < rawData.length; i++) {
        var item = rawData[i];
        var colId = item["Column ID"] || item["ColumnID"] || item["id"];
        if (colId) {
          var colObj = {
            id: colId,
            name: item["Name"] || "",
            type: item["Type"] || "text",
            position: Number(item["Position"] || 0),
            required: String(item["Required"]).toLowerCase() === "true",
            isSystemField: String(item["Is System Field"] || item["IsSystemField"]).toLowerCase() === "true",
            isHidden: String(item["Is Hidden"] || item["IsHidden"]).toLowerCase() === "true",
            options: item["Options"] ? String(item["Options"]).split(",").map(function(s){return s.trim();}).filter(Boolean) : [],
            createdDate: item["Created Date"] || item["CreatedDate"] || new Date().toISOString()
          };
          if (uniqueMap[colId] === undefined) {
            uniqueList.push(colObj);
            uniqueMap[colId] = uniqueList.length - 1;
          } else {
            uniqueList[uniqueMap[colId]] = colObj;
          }
        }
      }
      if (uniqueList.length < rawData.length) {
        saveJobColumns(ss, uniqueList);
      }
    }
  }

  var itemColsSheet = ss.getSheetByName("JobItemColumns");
  if (itemColsSheet && itemColsSheet.getLastRow() > 1) {
    var rawItemData = getTableData(ss, "JobItemColumns");
    if (Array.isArray(rawItemData) && rawItemData.length > 0) {
      var uniqueItemMap = {};
      var uniqueItemList = [];
      for (var j = 0; j < rawItemData.length; j++) {
        var itm = rawItemData[j];
        var itemColId = itm["Column ID"] || itm["ColumnID"] || itm["id"];
        if (itemColId) {
          var itemColObj = {
            id: itemColId,
            name: itm["Name"] || "",
            type: itm["Type"] || "text",
            position: Number(itm["Position"] || 0),
            required: String(itm["Required"]).toLowerCase() === "true",
            isSystemField: String(itm["Is System Field"] || item["IsSystemField"]).toLowerCase() === "true",
            isHidden: String(itm["Is Hidden"] || itm["IsHidden"]).toLowerCase() === "true",
            calculation: itm["Calculation"] || "none",
            options: itm["Options"] ? String(itm["Options"]).split(",").map(function(s){return s.trim();}).filter(Boolean) : []
          };
          if (uniqueItemMap[itemColId] === undefined) {
            uniqueItemList.push(itemColObj);
            uniqueItemMap[itemColId] = uniqueItemList.length - 1;
          } else {
            uniqueItemList[uniqueItemMap[itemColId]] = itemColObj;
          }
        }
      }
      if (uniqueItemList.length < rawItemData.length) {
        saveJobItemColumns(ss, uniqueItemList);
      }
    }
  }
}

function seedDefaultJobColumns(ss) {
  var sheet = ss.getSheetByName("JobColumns");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) return; // Already has data rows, do not overwrite custom columns!

  var defaultCols = [
    { id: "col-job-name", name: "Job Name", type: "text", position: 0, required: true, isSystemField: true, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-company", name: "Company", type: "company", position: 1, required: true, isSystemField: true, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-job-type", name: "Job Type", type: "dropdown", position: 2, required: false, isSystemField: false, isHidden: false, options: ["Screen Print", "DTF", "Sticker", "Digital Print", "Embroidery", "Sublimation", "Promotional Product", "Other"], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-status", name: "Status", type: "status", position: 3, required: true, isSystemField: true, isHidden: false, options: ["Pending", "Approved", "In Production", "Shipped", "Completed", "Canceled"], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-date-added", name: "Date Added", type: "date", position: 4, required: false, isSystemField: false, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-in-hand-date", name: "In-Hand Date", type: "date", position: 5, required: false, isSystemField: false, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-artwork-link", name: "Artwork Link", type: "link", position: 6, required: false, isSystemField: false, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-designer", name: "Designer", type: "person", position: 7, required: false, isSystemField: false, isHidden: false, options: ["Regie", "Alex M.", "Sarah K.", "Production Team"], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-priority", name: "Priority", type: "dropdown", position: 8, required: false, isSystemField: false, isHidden: false, options: ["Urgent", "High", "Normal", "Low"], createdDate: "2026-08-01T00:00:00.000Z" },
    { id: "col-notes", name: "Notes", type: "long_text", position: 9, required: false, isSystemField: false, isHidden: false, options: [], createdDate: "2026-08-01T00:00:00.000Z" }
  ];

  saveJobColumns(ss, defaultCols);
}

function seedDefaultJobItemColumns(ss) {
  var sheet = ss.getSheetByName("JobItemColumns");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) return; // Already has data rows, do not overwrite custom columns!

  var defaultItemCols = [
    { id: "col-sub-design", name: "Design Name", type: "text", position: 0, required: true, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-brand", name: "Brand", type: "text", position: 1, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-garment", name: "Garment / Item Type", type: "text", position: 2, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-sku", name: "SKU", type: "text", position: 3, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-colour", name: "Colour", type: "text", position: 4, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-onesize", name: "One Size", type: "number", position: 5, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-xs", name: "XS", type: "number", position: 6, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-s", name: "S", type: "number", position: 7, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-m", name: "M", type: "number", position: 8, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-l", name: "L", type: "number", position: 9, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-xl", name: "XL", type: "number", position: 10, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-2xl", name: "2XL", type: "number", position: 11, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-3xl", name: "3XL", type: "number", position: 12, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-4xl", name: "4XL", type: "number", position: 13, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-total-qty", name: "Total Qty", type: "number", position: 14, required: false, isSystemField: true, isHidden: false, calculation: "total_qty" },
    { id: "col-sub-amount-piece", name: "Amount / Piece", type: "currency", position: 15, required: false, isSystemField: false, isHidden: false, calculation: "none" },
    { id: "col-sub-total-amount", name: "Total Amount", type: "currency", position: 16, required: false, isSystemField: true, isHidden: false, calculation: "total_amount" }
  ];

  saveJobItemColumns(ss, defaultItemCols);
}

function getTableData(ss, sheetName) {
  var s = ss.getSheetByName(sheetName);
  if (!s) return [];
  var values = s.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var list = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var rawH = String(headers[c] || "").trim();
      if (!rawH) continue;
      obj[rawH] = row[c];
      obj[rawH.replace(/\s+/g, "")] = row[c];
      obj[rawH.toLowerCase().replace(/[^a-z0-9]/g, "")] = row[c];
    }
    list.push(obj);
  }
  return list;
}

function getOrdersWithItems(ss) {
  var orders = getTableData(ss, "Orders");
  var items = getTableData(ss, "OrderItems");
  
  return orders.map(function(order) {
    var orderId = order.OrderID || order["Order ID"];
    var orderItems = items.filter(function(item) {
      return (item.OrderID || item["Order ID"]) === orderId;
    }).map(function(item) {
      return {
        productId: item.ProductID || item["Product ID"],
        productName: item.ProductName || item["Product Name"],
        imageUrl: item.ImageURL || item["Image URL"] || "",
        quantity: Number(item.Quantity),
        price: Number(item.Price),
        selectedSize: item.SelectedSize || item["Selected Size"] || "",
        selectedColor: item.SelectedColor || item["Selected Color"] || "",
        customDetails: parseCustomDetails(item.CustomDetails || item["Custom Details"])
      };
    });
    
    return {
      id: orderId,
      orderNumber: order.OrderNumber || order["Order Number"] || order.OrderNo || order["Order #"] || order.id || order.orderNumber || "",
      companyName: order.CompanyName || order["Company Name"] || order.Company || order.Client || order.companyName || "",
      contactEmail: order.ContactEmail || order["Contact Email"] || order.Email || order.SubmitterEmail || order["Submitter Email"] || order.CustomerEmail || order.contactEmail || "",
      contactPerson: order.ContactPerson || order["Contact Person"] || order.contactPerson || order.Purchaser || order["Purchaser / Submitter"] || order.CustomerName || order["Customer Name"] || order.SubmitterName || order["Submitter Name"] || order.Name || order["Shopper Name"] || order.ShopperName || order.Buyer || order.BuyerName || order.Customer || "",
      contactNumber: order.ContactNumber || order["Contact Number"] || order.contactNumber || order.ContactPhone || order.Phone || order.Mobile || order.Contact || order.ShopperPhone || order.ContactNo || "",
      fbMessengerLink: order.FBMessengerLink || order["FB Messenger Link"] || order.fbMessengerLink || order.Messenger || order["Facebook Messenger Link"] || order.FacebookMessengerLink || order.FBMessenger || order.Facebook || "",
      deliveryAddress: order.DeliveryAddress || order["Delivery Address"] || order.deliveryAddress || order.Address || order["Address / Dept"] || order["Department / Address"] || order.DeliveryDept || order.ShippingAddress || order.CustomerAddress || "",
      poNumber: order.PONumber || order["PO Number"] || order.poNumber || order["PO / Cost Center"] || order.POCostCenter || order.PO || order.CostCenter || "",
      totalAmount: Number(order.TotalAmount || order["Total Amount"] || order.Amount || order.totalAmount || 0),
      status: order.Status || order.status || "Pending Approval",
      createdAt: order.CreatedAt || order["Created At"] || order.createdAt || order.Date || new Date().toISOString(),
      notes: order.Notes || order.notes || order.SpecialNotes || order["Order Notes"] || order.Remarks || order.Comments || order.OrderNotes || "",
      portalId: order.PortalID || order["Portal ID"] || order.portalId || "",
      portalName: order.PortalName || order["Portal Name"] || order.portalName || "",
      items: orderItems
    };
  });
}

function parseCustomDetails(str) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    // Return key value pairs parsed from string format
    var obj = {};
    var pairs = str.split(", ");
    pairs.forEach(function(pair) {
      var parts = pair.split(": ");
      if (parts.length >= 2) {
        obj[parts[0]] = parts.slice(1).join(": ");
      }
    });
    return obj;
  }
}

function saveNewOrder(ss, order) {
  var ordersSheet = ss.getSheetByName("Orders");
  var itemsSheet = ss.getSheetByName("OrderItems");
  
  var expectedOrdersHeaders = ["Order ID", "Order Number", "Company Name", "Contact Email", "Contact Person", "Contact Number", "FB Messenger Link", "Delivery Address", "PO Number", "Total Amount", "Status", "Created At", "Notes", "Portal ID", "Portal Name"];
  var ordersData = ensureHeaders(ordersSheet, expectedOrdersHeaders);
  var ordersHeaders = ordersData[0];
  
  var orderMap = {
    "Order ID": order.id,
    "Order Number": order.orderNumber,
    "Company Name": order.companyName,
    "Contact Email": order.contactEmail,
    "Contact Person": order.contactPerson,
    "Contact Number": order.contactNumber || "",
    "FB Messenger Link": order.fbMessengerLink || "",
    "Delivery Address": order.deliveryAddress,
    "PO Number": order.poNumber || "",
    "Total Amount": order.totalAmount,
    "Status": order.status || "Pending Approval",
    "Created At": order.createdAt,
    "Notes": order.notes || "",
    "Portal ID": order.portalId || "",
    "Portal Name": order.portalName || ""
  };
  
  var orderRow = [];
  for (var c = 0; c < ordersHeaders.length; c++) {
    orderRow.push(getMapValueByHeader(orderMap, ordersHeaders[c]));
  }
  ordersSheet.appendRow(orderRow);
  
  var expectedItemsHeaders = ["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details", "Selected Add-Ons"];
  var itemsData = ensureHeaders(itemsSheet, expectedItemsHeaders);
  var itemsHeaders = itemsData[0];
  
  order.items.forEach(function(item) {
    var detailsStr = "";
    if (item.customDetails) {
      detailsStr = JSON.stringify(item.customDetails);
    }

    var selectedAddOnsStr = "";
    if (item.selectedAddOns) {
      if (typeof item.selectedAddOns === 'string') {
        selectedAddOnsStr = item.selectedAddOns;
      } else {
        try { selectedAddOnsStr = JSON.stringify(item.selectedAddOns); } catch(e) {}
      }
    }
    
    var itemMap = {
      "Order ID": order.id,
      "Product ID": item.productId,
      "Product Name": item.productName,
      "Image URL": item.imageUrl || "",
      "Quantity": item.quantity,
      "Price": item.price,
      "Selected Size": item.selectedSize || "",
      "Selected Color": item.selectedColor || "",
      "Custom Details": detailsStr,
      "Selected Add-Ons": selectedAddOnsStr
    };
    
    var itemRow = [];
    for (var i = 0; i < itemsHeaders.length; i++) {
      itemRow.push(getMapValueByHeader(itemMap, itemsHeaders[i]));
    }
    itemsSheet.appendRow(itemRow);
  });
  
  return { status: "success", orderId: order.id, orderNumber: order.orderNumber };
}

function saveProduct(ss, product) {
  var sheet = ss.getSheetByName("Products");
  var expectedHeaders = ["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered", "Shipping Fee", "Lead Time", "Image URLs", "Custom Fields", "Add-Ons"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  if (!product) return { status: "error", message: "Missing product" };
  var targetId = String(product.id || "").trim();
  if (!targetId) return { status: "error", message: "Missing product ID" };

  var productIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "productid") {
      productIdIndex = c;
      break;
    }
  }
  if (productIdIndex === -1) productIdIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][productIdIndex]).trim() === targetId) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }
  
  var sizeOptionsStr = "";
  if (Array.isArray(product.sizeOptions)) {
    sizeOptionsStr = product.sizeOptions.join(", ");
  } else if (Array.isArray(product.sizes)) {
    sizeOptionsStr = product.sizes.join(", ");
  } else if (product.sizeOptions) {
    sizeOptionsStr = String(product.sizeOptions);
  } else if (product.sizes) {
    sizeOptionsStr = String(product.sizes);
  }

  var colorOptionsStr = "";
  if (Array.isArray(product.colorOptions)) {
    colorOptionsStr = product.colorOptions.join(", ");
  } else if (Array.isArray(product.colors)) {
    colorOptionsStr = product.colors.map(function(c) {
      return (typeof c === 'object' && c && c.name) ? c.name : String(c);
    }).join(", ");
  } else if (product.colorOptions) {
    colorOptionsStr = String(product.colorOptions);
  } else if (product.colors) {
    colorOptionsStr = String(product.colors);
  }

  var imageUrlsStr = "";
  if (Array.isArray(product.imageUrls)) {
    imageUrlsStr = product.imageUrls.join(";||;");
  } else if (product.imageUrls) {
    imageUrlsStr = String(product.imageUrls);
  }

  var customFieldsStr = "";
  if (product.customFields) {
    if (typeof product.customFields === 'string') {
      customFieldsStr = product.customFields;
    } else {
      try { customFieldsStr = JSON.stringify(product.customFields); } catch(e) {}
    }
  }

  var addOnsStr = "";
  if (product.addOns) {
    if (typeof product.addOns === 'string') {
      addOnsStr = product.addOns;
    } else {
      try { addOnsStr = JSON.stringify(product.addOns); } catch(e) {}
    }
  }
  
  var productMap = {
    "Product ID": targetId,
    "Name": product.name || "",
    "Category": product.category || "",
    "Description": product.description || "",
    "Image URL": product.imageUrl || "",
    "Base Price": product.basePrice || 0,
    "Original Price": product.originalPrice || 0,
    "Min Quantity": product.minQuantity || 1,
    "Unit": product.unit || "pcs",
    "Size Options": sizeOptionsStr,
    "Color Options": colorOptionsStr,
    "Frequently Ordered": product.frequentlyOrdered ? "TRUE" : "FALSE",
    "Shipping Fee": product.shippingFee !== undefined ? product.shippingFee : 0,
    "Lead Time": product.leadTime || "5-7 Business Days",
    "Image URLs": imageUrlsStr,
    "Custom Fields": customFieldsStr,
    "Add-Ons": addOnsStr
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(productMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", productId: targetId };
}

function saveCompany(ss, company) {
  var sheet = ss.getSheetByName("Companies");
  var expectedHeaders = ["Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Delivery Address", "Username", "Passcode", "PO Required", "Logo URL", "Approved Products", "Custom Products"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  var companyIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "companyid") {
      companyIdIndex = c;
      break;
    }
  }
  if (companyIdIndex === -1) companyIdIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][companyIdIndex]).trim() === String(company.id).trim()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var enabledProductsStr = "";
  if (company.enabledProductIds) {
    enabledProductsStr = company.enabledProductIds.length === 0 ? "NONE" : company.enabledProductIds.join(", ");
  }
  var customProductsStr = company.customProducts ? JSON.stringify(company.customProducts) : "";
  
  var companyMap = {
    "Company ID": company.id,
    "Company Name": company.name,
    "Contact Person": company.contactPerson || "",
    "Contact Email": company.contactEmail || "",
    "Contact Phone": company.contactPhone || "",
    "Delivery Address": company.deliveryAddress || "",
    "Username": company.username || "",
    "Passcode": company.passcode || "",
    "PO Required": company.poRequired ? "TRUE" : "FALSE",
    "Logo URL": company.logoUrl || "",
    "Approved Products": enabledProductsStr,
    "Custom Products": customProductsStr
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(companyMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", companyId: company.id };
}

function savePortal(ss, portal) {
  var sheet = ss.getSheetByName("Portals");
  var expectedHeaders = ["Portal ID", "Company ID", "Company Name", "Portal Name", "Description", "Status", "Product IDs", "Portal Pricing", "Variant Pricing", "Add-On Pricing", "Created At", "Updated At", "Share Token"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  var idIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "portalid") {
      idIndex = c;
      break;
    }
  }
  if (idIndex === -1) idIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(portal.id).trim()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var productIdsStr = portal.productIds ? portal.productIds.join(", ") : "";
  var portalPricingStr = portal.customPrices ? JSON.stringify(portal.customPrices) : "";
  var variantPricingStr = portal.customVariantPrices ? JSON.stringify(portal.customVariantPrices) : "";
  var addOnPricingStr = portal.customAddOnPrices ? JSON.stringify(portal.customAddOnPrices) : "";
  
  var portalMap = {
    "Portal ID": portal.id,
    "Company ID": portal.companyId || "",
    "Company Name": portal.companyName || "",
    "Portal Name": portal.name || "",
    "Description": portal.description || "",
    "Status": portal.status || "Active",
    "Product IDs": productIdsStr,
    "Portal Pricing": portalPricingStr,
    "Variant Pricing": variantPricingStr,
    "Add-On Pricing": addOnPricingStr,
    "Created At": portal.createdAt || new Date().toISOString(),
    "Updated At": portal.updatedAt || new Date().toISOString(),
    "Share Token": portal.shareToken || ""
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(portalMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", portalId: portal.id };
}

function deleteRowById(ss, sheetName, colHeader, targetId) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var colIndex = -1;
  var normColHeader = colHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === normColHeader) {
      colIndex = c;
      break;
    }
  }
  if (colIndex === -1) colIndex = 0;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]).trim() === String(targetId).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", id: targetId, deleted: true };
    }
  }
  return { status: "success", id: targetId, deleted: false };
}

function deleteOrder(ss, orderId) {
  // Delete from Orders tab
  deleteRowById(ss, "Orders", "Order ID", orderId);
  
  // Delete all matching rows in OrderItems tab from bottom to top
  var itemsSheet = ss.getSheetByName("OrderItems");
  if (itemsSheet) {
    var itemsData = itemsSheet.getDataRange().getValues();
    var headers = itemsData[0];
    
    var colIndex = -1;
    for (var c = 0; c < headers.length; c++) {
      if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "orderid") {
        colIndex = c;
        break;
      }
    }
    if (colIndex === -1) colIndex = 0;
    
    for (var i = itemsData.length - 1; i >= 1; i--) {
      if (String(itemsData[i][colIndex]) === String(orderId)) {
        itemsSheet.deleteRow(i + 1);
      }
    }
  }
  return { status: "success", orderId: orderId, deleted: true };
}

function updateOrderStatus(ss, orderId, status) {
  var sheet = ss.getSheetByName("Orders");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idIndex = -1;
  var orderNumIndex = -1;
  var statusIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "orderid") {
      idIndex = c;
    } else if (normH === "ordernumber") {
      orderNumIndex = c;
    } else if (normH === "status" || normH.indexOf("status") !== -1) {
      statusIndex = c;
    }
  }
  if (idIndex === -1) idIndex = 0;
  if (statusIndex === -1) statusIndex = 10;
  
  var cleanTargetId = String(orderId).trim();
  for (var i = 1; i < data.length; i++) {
    var rowId = String(data[i][idIndex]).trim();
    var rowOrderNum = orderNumIndex !== -1 ? String(data[i][orderNumIndex]).trim() : "";
    if (rowId === cleanTargetId || (rowOrderNum && rowOrderNum === cleanTargetId)) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status);
      return { status: "success", orderId: orderId, updated: true };
    }
  }
  return { status: "error", message: "Order not found" };
}

function saveCatalogProduct(ss, product) {
  var sheet = ss.getSheetByName("CatalogProducts");
  var expectedHeaders = ["Product ID", "SKU", "Name", "Category", "Description", "Image URL", "Image URLs", "MOQ", "Lead Time", "Branding Methods", "Colors", "Sizes", "Status"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  if (!product) return { status: "error", message: "Missing product" };
  var targetId = String(product.id || "").trim();
  if (!targetId) return { status: "error", message: "Missing product ID" };

  var productIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "productid") {
      productIdIndex = c;
      break;
    }
  }
  if (productIdIndex === -1) productIdIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][productIdIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var brandingStr = "";
  if (Array.isArray(product.brandingMethods)) {
    brandingStr = product.brandingMethods.join(", ");
  } else if (product.brandingMethods) {
    brandingStr = String(product.brandingMethods);
  }

  var colorsStr = "";
  if (product.colors) {
    if (typeof product.colors === 'string') {
      colorsStr = product.colors;
    } else {
      try { colorsStr = JSON.stringify(product.colors); } catch(e) {}
    }
  }

  var sizesStr = "";
  if (Array.isArray(product.sizes)) {
    sizesStr = product.sizes.join(", ");
  } else if (product.sizes) {
    sizesStr = String(product.sizes);
  }

  var imageUrlsStr = "";
  if (Array.isArray(product.imageUrls)) {
    imageUrlsStr = product.imageUrls.join(";||;");
  } else if (product.imageUrls) {
    imageUrlsStr = String(product.imageUrls);
  }
  
  var productMap = {
    "Product ID": targetId,
    "SKU": product.sku || "",
    "Name": product.name || "",
    "Category": product.category || "",
    "Description": product.description || "",
    "Image URL": product.imageUrl || "",
    "Image URLs": imageUrlsStr,
    "MOQ": product.moq || 50,
    "Lead Time": product.leadTime || "7-10 Business Days",
    "Branding Methods": brandingStr,
    "Colors": colorsStr,
    "Sizes": sizesStr,
    "Status": product.status || "Active"
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(productMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", productId: targetId };
}

function saveQuoteEnquiry(ss, enquiry) {
  var sheet = ss.getSheetByName("Quotes");
  var expectedHeaders = ["Enquiry ID", "Enquiry Number", "Product ID", "Product Name", "Product Category", "Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Quantity", "Preferred Branding Method", "Preferred Color", "Preferred Size", "Notes", "Status", "Created At", "Quoted Unit Price", "Quoted Total Price", "Quoted Tax", "Quoted Shipping", "Quote Notes", "Quoted Valid Until", "Quoted At", "Quoted Line Items", "Requested Product Addition", "Requested Product Addition At", "Requested Product Notes"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  var enquiryIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "") === "enquiryid") {
      enquiryIdIndex = c;
      break;
    }
  }
  if (enquiryIdIndex === -1) enquiryIdIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][enquiryIdIndex]).trim() === String(enquiry.id).trim()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var lineItemsStr = enquiry.quotedLineItems ? JSON.stringify(enquiry.quotedLineItems) : "";

  var quoteMap = {
    "Enquiry ID": enquiry.id,
    "Enquiry Number": enquiry.enquiryNumber || "",
    "Product ID": enquiry.productId || "",
    "Product Name": enquiry.productName || "",
    "Product Category": enquiry.productCategory || "",
    "Company ID": enquiry.companyId || "",
    "Company Name": enquiry.companyName || "",
    "Contact Person": enquiry.contactPerson || "",
    "Contact Email": enquiry.contactEmail || "",
    "Contact Phone": enquiry.contactPhone || "",
    "Quantity": enquiry.quantity || 1,
    "Preferred Branding Method": enquiry.preferredBrandingMethod || "",
    "Preferred Color": enquiry.preferredColor || "",
    "Preferred Size": enquiry.preferredSize || "",
    "Notes": enquiry.notes || "",
    "Status": enquiry.status || "New",
    "Created At": enquiry.createdAt || new Date().toISOString(),
    "Quoted Unit Price": enquiry.quotedUnitPrice !== undefined ? enquiry.quotedUnitPrice : "",
    "Quoted Total Price": enquiry.quotedTotalPrice !== undefined ? enquiry.quotedTotalPrice : "",
    "Quoted Tax": enquiry.quotedTax !== undefined ? enquiry.quotedTax : "",
    "Quoted Shipping": enquiry.quotedShipping !== undefined ? enquiry.quotedShipping : "",
    "Quote Notes": enquiry.quoteNotes || "",
    "Quoted Valid Until": enquiry.quotedValidUntil || "",
    "Quoted At": enquiry.quotedAt || "",
    "Quoted Line Items": lineItemsStr,
    "Requested Product Addition": enquiry.requestedProductAddition ? "TRUE" : "FALSE",
    "Requested Product Addition At": enquiry.requestedProductAdditionAt || "",
    "Requested Product Notes": enquiry.requestedProductNotes || ""
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(quoteMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", enquiryId: enquiry.id };
}

function updateQuoteEnquiryStatus(ss, enquiryId, status) {
  var sheet = ss.getSheetByName("Quotes");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idIndex = -1;
  var statusIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "enquiryid") {
      idIndex = c;
    } else if (normH === "status") {
      statusIndex = c;
    }
  }
  if (idIndex === -1) idIndex = 0;
  if (statusIndex === -1) statusIndex = 14;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === String(enquiryId).trim()) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status);
      return { status: "success", enquiryId: enquiryId, updated: true };
    }
  }
  return { status: "error", message: "Quote enquiry not found" };
}

function saveAdminSettings(ss, settings, adminUser, adminPass) {
  var sheet = ss.getSheetByName("Admin");
  var expectedHeaders = ["Hub Name", "Short Hub Name", "Company Tagline", "Company Address", "Tax TIN ID", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme", "Admin Email", "App Logo URL", "App Favicon URL"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  var maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    try {
      sheet.deleteRows(2, maxRows - 1);
    } catch(e) {
      // ignore
    }
  }
  
  var adminMap = {
    "Hub Name": settings.hubName,
    "Short Hub Name": settings.shortHubName,
    "Company Tagline": settings.companyTagline || "",
    "Company Address": settings.companyAddress || "",
    "Tax TIN ID": settings.taxId || settings.tinNumber || "",
    "Order Prefix": settings.orderPrefix,
    "Currency Symbol": settings.currencySymbol,
    "Admin Username": adminUser || "admin",
    "Admin Passcode": adminPass || "1234",
    "Color Theme": settings.colorTheme || "classic_noir",
    "Admin Email": settings.adminEmail || "",
    "App Logo URL": settings.logoUrl || "",
    "App Favicon URL": settings.faviconUrl || ""
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(adminMap, headers[c]));
  }
  
  sheet.appendRow(rowData);
  return { status: "success" };
}

function saveNotification(ss, notif) {
  var sheet = ss.getSheetByName("Notifications");
  var expectedHeaders = ["Notification ID", "Recipient Type", "Company Name", "Title", "Message", "Timestamp", "Read", "Order ID", "Order Number", "Type"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!notif) return { status: "error", message: "Missing notification" };
  var targetId = String(notif.id || "").trim();
  if (!targetId) return { status: "error", message: "Missing notification ID" };

  var notifIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "notificationid" || normH === "id") {
      notifIdIndex = c;
      break;
    }
  }
  if (notifIdIndex === -1) notifIdIndex = 0;

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][notifIdIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var notifMap = {
    "Notification ID": notif.id,
    "Recipient Type": notif.recipientType || "admin",
    "Company Name": notif.companyName || "",
    "Title": notif.title || "",
    "Message": notif.message || "",
    "Timestamp": notif.timestamp || new Date().toISOString(),
    "Read": notif.read ? "TRUE" : "FALSE",
    "Order ID": notif.orderId || "",
    "Order Number": notif.orderNumber || "",
    "Type": notif.type || "new_storefront_order"
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(notifMap, headers[c]));
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", notificationId: notif.id };
}

function saveNotifications(ss, notifications) {
  if (!Array.isArray(notifications)) return { status: "error", message: "Invalid array" };
  notifications.forEach(function(n) {
    saveNotification(ss, n);
  });
  return { status: "success", count: notifications.length };
}

function markNotificationRead(ss, notifId) {
  var sheet = ss.getSheetByName("Notifications");
  var expectedHeaders = ["Notification ID", "Recipient Type", "Company Name", "Title", "Message", "Timestamp", "Read", "Order ID", "Order Number", "Type"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  var notifIdIndex = -1, readIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "notificationid" || normH === "id") notifIdIndex = c;
    if (normH === "read") readIndex = c;
  }
  if (notifIdIndex === -1) notifIdIndex = 0;
  if (readIndex === -1) readIndex = 6;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][notifIdIndex]).trim() === String(notifId).trim()) {
      sheet.getRange(i + 1, readIndex + 1).setValue("TRUE");
      break;
    }
  }
  return { status: "success" };
}

function clearNotifications(ss) {
  var sheet = ss.getSheetByName("Notifications");
  if (sheet && sheet.getMaxRows() > 1) {
    try {
      sheet.deleteRows(2, sheet.getMaxRows() - 1);
    } catch (e) {}
  }
  return { status: "success" };
}

function saveJob(ss, job) {
  var sheet = ss.getSheetByName("Jobs");
  var expectedHeaders = ["Job ID", "Company ID", "Company Name", "Order ID", "Order Number", "Source", "Status", "Position", "Values JSON", "Items JSON", "Activities JSON", "Created At", "Updated At", "Created By"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  if (!job) return { status: "error", message: "Missing job" };
  var targetId = String(job.id || "").trim();
  if (!targetId) return { status: "error", message: "Missing job ID" };

  var jobIdIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "jobid" || normH === "id") {
      jobIdIndex = c;
      break;
    }
  }
  if (jobIdIndex === -1) jobIdIndex = 0;
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][jobIdIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var valuesJsonStr = "";
  if (job.values) {
    valuesJsonStr = typeof job.values === 'string' ? job.values : JSON.stringify(job.values);
  }
  
  var itemsJsonStr = "";
  if (job.items) {
    itemsJsonStr = typeof job.items === 'string' ? job.items : JSON.stringify(job.items);
  }
  
  var activitiesJsonStr = "";
  if (job.activities) {
    activitiesJsonStr = typeof job.activities === 'string' ? job.activities : JSON.stringify(job.activities);
  }

  var jobMap = {
    "Job ID": targetId,
    "Company ID": job.companyId || "",
    "Company Name": job.companyName || "",
    "Order ID": job.orderId || "",
    "Order Number": job.orderNumber || "",
    "Source": job.source || "Manual",
    "Status": job.status || "Pending",
    "Position": job.position !== undefined ? job.position : 0,
    "Values JSON": valuesJsonStr,
    "Items JSON": itemsJsonStr,
    "Activities JSON": activitiesJsonStr,
    "Created At": job.createdAt || new Date().toISOString(),
    "Updated At": job.updatedAt || new Date().toISOString(),
    "Created By": job.createdBy || "Admin"
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(jobMap, headers[c]));
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { status: "success", jobId: targetId };
}

function saveJobsBatch(ss, jobs) {
  if (!Array.isArray(jobs)) return { status: "error", message: "Invalid array" };
  jobs.forEach(function(j) {
    saveJob(ss, j);
  });
  return { status: "success", count: jobs.length };
}

function updateJobStatus(ss, jobId, status) {
  var sheet = ss.getSheetByName("Jobs");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idIndex = -1;
  var statusIndex = -1;
  var updatedAtIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "jobid" || normH === "id") {
      idIndex = c;
    } else if (normH === "status") {
      statusIndex = c;
    } else if (normH === "updatedat" || normH === "updateddate") {
      updatedAtIndex = c;
    }
  }
  if (idIndex === -1) idIndex = 0;
  if (statusIndex === -1) statusIndex = 6;
  
  var cleanTargetId = String(jobId).trim();
  for (var i = 1; i < data.length; i++) {
    var rowId = String(data[i][idIndex]).trim();
    if (rowId === cleanTargetId) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status);
      if (updatedAtIndex !== -1) {
        sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date().toISOString());
      }
      return { status: "success", jobId: jobId, updated: true };
    }
  }
  return { status: "error", message: "Job not found" };
}

function saveJobColumns(ss, columns) {
  var sheet = ss.getSheetByName("JobColumns");
  var expectedHeaders = ["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Options", "Created Date"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  if (!Array.isArray(columns)) return { status: "error", message: "Invalid columns array" };

  // Reliably clear existing data rows (row 2 down) without breaking grid dimensions
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Deduplicate incoming array by Column ID (preserving order, keeping latest definition)
  var uniqueColsMap = {};
  var uniqueColsList = [];
  for (var i = 0; i < columns.length; i++) {
    var cObj = columns[i];
    if (cObj && cObj.id) {
      if (uniqueColsMap[cObj.id] === undefined) {
        uniqueColsList.push(cObj);
        uniqueColsMap[cObj.id] = uniqueColsList.length - 1;
      } else {
        uniqueColsList[uniqueColsMap[cObj.id]] = cObj;
      }
    }
  }

  uniqueColsList.forEach(function(col) {
    var optionsStr = "";
    if (Array.isArray(col.options)) {
      optionsStr = col.options.join(", ");
    } else if (col.options) {
      optionsStr = String(col.options);
    }
    
    var colMap = {
      "Column ID": col.id,
      "Name": col.name || "",
      "Type": col.type || "text",
      "Position": col.position !== undefined ? col.position : 0,
      "Required": col.required ? "TRUE" : "FALSE",
      "Is System Field": col.isSystemField ? "TRUE" : "FALSE",
      "Is Hidden": col.isHidden ? "TRUE" : "FALSE",
      "Options": optionsStr,
      "Created Date": col.createdDate || new Date().toISOString()
    };
    
    var row = [];
    for (var c = 0; c < headers.length; c++) {
      row.push(getMapValueByHeader(colMap, headers[c]));
    }
    sheet.appendRow(row);
  });
  
  return { status: "success", count: uniqueColsList.length };
}

function saveJobItemColumns(ss, columns) {
  var sheet = ss.getSheetByName("JobItemColumns");
  var expectedHeaders = ["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Calculation", "Options"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];
  
  if (!Array.isArray(columns)) return { status: "error", message: "Invalid columns array" };

  // Reliably clear existing data rows (row 2 down) without breaking grid dimensions
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Deduplicate incoming array by Column ID (preserving order, keeping latest definition)
  var uniqueColsMap = {};
  var uniqueColsList = [];
  for (var i = 0; i < columns.length; i++) {
    var cObj = columns[i];
    if (cObj && cObj.id) {
      if (uniqueColsMap[cObj.id] === undefined) {
        uniqueColsList.push(cObj);
        uniqueColsMap[cObj.id] = uniqueColsList.length - 1;
      } else {
        uniqueColsList[uniqueColsMap[cObj.id]] = cObj;
      }
    }
  }

  uniqueColsList.forEach(function(col) {
    var optionsStr = "";
    if (Array.isArray(col.options)) {
      optionsStr = col.options.join(", ");
    } else if (col.options) {
      optionsStr = String(col.options);
    }
    
    var colMap = {
      "Column ID": col.id,
      "Name": col.name || "",
      "Type": col.type || "text",
      "Position": col.position !== undefined ? col.position : 0,
      "Required": col.required ? "TRUE" : "FALSE",
      "Is System Field": col.isSystemField ? "TRUE" : "FALSE",
      "Is Hidden": col.isHidden ? "TRUE" : "FALSE",
      "Calculation": col.calculation || "none",
      "Options": optionsStr
    };
    
    var row = [];
    for (var c = 0; c < headers.length; c++) {
      row.push(getMapValueByHeader(colMap, headers[c]));
    }
    sheet.appendRow(row);
  });
  
  return { status: "success", count: uniqueColsList.length };
}

function saveStaff(ss, staff) {
  var sheet = ss.getSheetByName("Staff");
  var expectedHeaders = ["Staff ID", "Full Name", "Position", "Department", "Employment Status", "Date Started", "Salary Type", "Basic Salary", "Allowances", "Other Compensation", "Notes", "Status", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!staff) return { status: "error", message: "Missing staff data" };
  var targetId = String(staff.id || staff["Staff ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing staff ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "staffid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var staffMap = {
    "Staff ID": targetId,
    "Full Name": staff.fullName || staff.name || "",
    "Position": staff.position || "",
    "Department": staff.department || "",
    "Employment Status": staff.employmentStatus || "Full-Time",
    "Date Started": staff.dateStarted || "",
    "Salary Type": staff.salaryType || "Monthly",
    "Basic Salary": staff.basicSalary !== undefined ? Number(staff.basicSalary) : 0,
    "Allowances": staff.allowances !== undefined ? Number(staff.allowances) : 0,
    "Other Compensation": staff.otherCompensation !== undefined ? Number(staff.otherCompensation) : 0,
    "Notes": staff.notes || "",
    "Status": staff.status || "Active",
    "Created At": staff.createdAt || new Date().toISOString(),
    "Updated At": staff.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(staffMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", staffId: targetId };
}

function saveStaffBatch(ss, staffMembers) {
  if (!Array.isArray(staffMembers)) return { status: "error", message: "Invalid array" };
  staffMembers.forEach(function(s) {
    saveStaff(ss, s);
  });
  return { status: "success", count: staffMembers.length };
}

function savePayroll(ss, record) {
  var sheet = ss.getSheetByName("Payroll");
  var expectedHeaders = ["Payroll ID", "Staff ID", "Staff Name", "Position", "Department", "Pay Period Start", "Pay Period End", "Pay Date", "Basic Pay", "Allowances", "Other Earnings", "Gross Pay", "Deductions", "Itemized Deductions JSON", "Total Deductions", "Net Pay", "Status", "Notes", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!record) return { status: "error", message: "Missing payroll data" };
  var targetId = String(record.id || record["Payroll ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing payroll ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "payrollid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var itemizedJson = "";
  if (record.itemizedDeductions) {
    itemizedJson = typeof record.itemizedDeductions === 'string' ? record.itemizedDeductions : JSON.stringify(record.itemizedDeductions);
  }

  var payMap = {
    "Payroll ID": targetId,
    "Staff ID": record.staffId || "",
    "Staff Name": record.staffName || "",
    "Position": record.position || "",
    "Department": record.department || "",
    "Pay Period Start": record.payPeriodStart || "",
    "Pay Period End": record.payPeriodEnd || "",
    "Pay Date": record.payDate || "",
    "Basic Pay": record.basicPay !== undefined ? Number(record.basicPay) : 0,
    "Allowances": record.allowances !== undefined ? Number(record.allowances) : 0,
    "Other Earnings": record.otherEarnings !== undefined ? Number(record.otherEarnings) : 0,
    "Gross Pay": record.grossPay !== undefined ? Number(record.grossPay) : 0,
    "Deductions": record.deductions !== undefined ? Number(record.deductions) : 0,
    "Itemized Deductions JSON": itemizedJson,
    "Total Deductions": record.totalDeductions !== undefined ? Number(record.totalDeductions) : (record.deductions !== undefined ? Number(record.deductions) : 0),
    "Net Pay": record.netPay !== undefined ? Number(record.netPay) : 0,
    "Status": record.status || "Draft",
    "Notes": record.notes || "",
    "Created At": record.createdAt || new Date().toISOString(),
    "Updated At": record.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(payMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", payrollId: targetId };
}

function savePayrollBatch(ss, records) {
  if (!Array.isArray(records)) return { status: "error", message: "Invalid array" };
  records.forEach(function(r) {
    savePayroll(ss, r);
  });
  return { status: "success", count: records.length };
}

function saveExpense(ss, expense) {
  var sheet = ss.getSheetByName("Expenses");
  var expectedHeaders = ["Expense ID", "Expense Name", "Category", "Expense Type", "Amount", "Expense Date", "Payment Status", "Payment Date", "Vendor", "Reference Number", "Notes", "Recurring Expense ID", "Payroll ID", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!expense) return { status: "error", message: "Missing expense data" };
  var targetId = String(expense.id || expense["Expense ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing expense ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "expenseid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var expMap = {
    "Expense ID": targetId,
    "Expense Name": expense.name || expense.expenseName || "",
    "Category": expense.category || "Miscellaneous",
    "Expense Type": expense.expenseType || expense.type || "One-Time",
    "Amount": expense.amount !== undefined ? Number(expense.amount) : 0,
    "Expense Date": expense.expenseDate || expense.date || "",
    "Payment Status": expense.paymentStatus || "Paid",
    "Payment Date": expense.paymentDate || "",
    "Vendor": expense.vendor || "",
    "Reference Number": expense.referenceNumber || "",
    "Notes": expense.notes || "",
    "Recurring Expense ID": expense.recurringExpenseId || "",
    "Payroll ID": expense.payrollId || "",
    "Created At": expense.createdAt || new Date().toISOString(),
    "Updated At": expense.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(expMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", expenseId: targetId };
}

function saveExpensesBatch(ss, expenses) {
  if (!Array.isArray(expenses)) return { status: "error", message: "Invalid array" };
  expenses.forEach(function(e) {
    saveExpense(ss, e);
  });
  return { status: "success", count: expenses.length };
}

function saveExpenseCategories(ss, categories) {
  var sheet = ss.getSheetByName("ExpenseCategories");
  var expectedHeaders = ["Category ID", "Name", "Is System", "Status"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!Array.isArray(categories)) return { status: "error", message: "Invalid categories array" };

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  var uniqueMap = {};
  var uniqueList = [];
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    if (cat && (cat.id || cat.name)) {
      var catId = cat.id || "cat-" + String(cat.name).toLowerCase().replace(/[^a-z0-9]/g, "-");
      if (uniqueMap[catId] === undefined) {
        uniqueList.push({
          id: catId,
          name: cat.name || "",
          isSystem: cat.isSystem ? "TRUE" : "FALSE",
          status: cat.status || "Active"
        });
        uniqueMap[catId] = uniqueList.length - 1;
      } else {
        uniqueList[uniqueMap[catId]] = {
          id: catId,
          name: cat.name || "",
          isSystem: cat.isSystem ? "TRUE" : "FALSE",
          status: cat.status || "Active"
        };
      }
    }
  }

  uniqueList.forEach(function(cObj) {
    var row = [];
    var map = {
      "Category ID": cObj.id,
      "Name": cObj.name,
      "Is System": cObj.isSystem,
      "Status": cObj.status
    };
    for (var c = 0; c < headers.length; c++) {
      row.push(getMapValueByHeader(map, headers[c]));
    }
    sheet.appendRow(row);
  });

  return { status: "success", count: uniqueList.length };
}

function saveRecurringExpense(ss, rule) {
  var sheet = ss.getSheetByName("RecurringExpenses");
  var expectedHeaders = ["Recurring Expense ID", "Expense Name", "Category", "Amount", "Frequency", "Start Date", "End Date", "Payments Per Year", "Specific Months JSON", "Status", "Notes", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!rule) return { status: "error", message: "Missing recurring expense data" };
  var targetId = String(rule.id || rule["Recurring Expense ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing recurring expense ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "recurringexpenseid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var specificMonthsJson = "";
  if (rule.specificMonths) {
    specificMonthsJson = typeof rule.specificMonths === 'string' ? rule.specificMonths : JSON.stringify(rule.specificMonths);
  }

  var ruleMap = {
    "Recurring Expense ID": targetId,
    "Expense Name": rule.name || rule.expenseName || "",
    "Category": rule.category || "Miscellaneous",
    "Amount": rule.amount !== undefined ? Number(rule.amount) : 0,
    "Frequency": rule.frequency || "Monthly",
    "Start Date": rule.startDate || "",
    "End Date": rule.endDate || "",
    "Payments Per Year": rule.paymentsPerYear !== undefined ? Number(rule.paymentsPerYear) : 12,
    "Specific Months JSON": specificMonthsJson,
    "Status": rule.status || "Active",
    "Notes": rule.notes || "",
    "Created At": rule.createdAt || new Date().toISOString(),
    "Updated At": rule.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(ruleMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", ruleId: targetId };
}

function saveRecurringExpensesBatch(ss, rules) {
  if (!Array.isArray(rules)) return { status: "error", message: "Invalid array" };
  rules.forEach(function(r) {
    saveRecurringExpense(ss, r);
  });
  return { status: "success", count: rules.length };
}

function saveStaffAccount(ss, account) {
  var sheet = ss.getSheetByName("StaffAccounts");
  var expectedHeaders = ["Account ID", "Staff ID", "Name", "Username", "Passcode", "Role", "Status", "Email", "Phone", "Avatar URL", "Last Login", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!account) return { status: "error", message: "Missing staff account data" };
  var targetId = String(account.id || account["Account ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing account ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "accountid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var accMap = {
    "Account ID": targetId,
    "Staff ID": account.staffId || "",
    "Name": account.name || "",
    "Username": account.username || "",
    "Passcode": account.passcode || "",
    "Role": account.role || "Staff",
    "Status": account.status || "Active",
    "Email": account.email || "",
    "Phone": account.phone || "",
    "Avatar URL": account.avatarUrl || "",
    "Last Login": account.lastLogin || "",
    "Created At": account.createdAt || new Date().toISOString(),
    "Updated At": account.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(accMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", accountId: targetId };
}

function saveStaffAccountsBatch(ss, accounts) {
  if (!Array.isArray(accounts)) return { status: "error", message: "Invalid array" };
  accounts.forEach(function(a) {
    saveStaffAccount(ss, a);
  });
  return { status: "success", count: accounts.length };
}

function saveAttendance(ss, record) {
  var sheet = ss.getSheetByName("Attendance");
  var expectedHeaders = ["Attendance ID", "Staff ID", "Staff Name", "Date", "Clock In", "Clock Out", "Total Hours", "Status", "Notes", "Created At", "Updated At"];
  var data = ensureHeaders(sheet, expectedHeaders);
  var headers = data[0];

  if (!record) return { status: "error", message: "Missing attendance data" };
  var targetId = String(record.id || record["Attendance ID"] || "").trim();
  if (!targetId) return { status: "error", message: "Missing attendance ID" };

  var idIndex = 0;
  for (var c = 0; c < headers.length; c++) {
    var normH = headers[c].toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normH === "attendanceid" || normH === "id") {
      idIndex = c;
      break;
    }
  }

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === targetId) {
      rowIndex = i + 1;
      break;
    }
  }

  var attMap = {
    "Attendance ID": targetId,
    "Staff ID": record.staffId || "",
    "Staff Name": record.staffName || "",
    "Date": record.date || new Date().toISOString().split("T")[0],
    "Clock In": record.clockIn || "",
    "Clock Out": record.clockOut || "",
    "Total Hours": record.totalHours !== undefined ? Number(record.totalHours) : 0,
    "Status": record.status || "Present",
    "Notes": record.notes || "",
    "Created At": record.createdAt || new Date().toISOString(),
    "Updated At": record.updatedAt || new Date().toISOString()
  };

  var row = [];
  for (var c = 0; c < headers.length; c++) {
    row.push(getMapValueByHeader(attMap, headers[c]));
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: "success", attendanceId: targetId };
}

function saveAttendanceBatch(ss, records) {
  if (!Array.isArray(records)) return { status: "error", message: "Invalid array" };
  records.forEach(function(r) {
    saveAttendance(ss, r);
  });
  return { status: "success", count: records.length };
}

function getJsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-black p-6 rounded-none space-y-6">
      <div className="flex items-center space-x-3 border-b border-black pb-4">
        <Database className="w-6 h-6 text-black" />
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-black">Google Sheets Connection</h3>
          <p className="text-xs text-gray-500 font-mono">App Script Integration Guide</p>
        </div>
      </div>

      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          You can use a real **Google Sheet** as your live B2B database. 
          When connected, any orders placed in this portal will instantly append to your Google Sheet!
        </p>

        <h4 className="font-bold text-black uppercase tracking-wider text-xs pt-2">Step-by-Step Setup:</h4>
        <ol className="list-decimal list-inside space-y-2 text-xs font-mono bg-gray-50 p-4 border border-gray-200">
          <li>Create a new Google Spreadsheet and name it <span className="font-bold">ARH Print Orders</span>.</li>
          <li>In the menu bar, go to <span className="font-bold">Extensions &gt; Apps Script</span>.</li>
          <li>Delete the placeholder code <span className="text-gray-400">myFunction()</span>.</li>
          <li>Copy the script below and paste it into the editor.</li>
          <li>Click the <span className="font-bold">Save</span> icon (floppy disk).</li>
          <li>Click <span className="font-bold">Deploy &gt; New deployment</span>.</li>
          <li>Click the gear icon next to "Select type" and choose <span className="font-bold">Web app</span>.</li>
          <li>Under Web App settings, set:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Execute as: <span className="font-bold">Me (your-email)</span></li>
              <li>Who has access: <span className="font-bold">Anyone</span> (Crucial! Do not set to "Only myself")</li>
            </ul>
          </li>
          <li>Click <span className="font-bold text-white bg-black px-1">Deploy</span>, authorize Google permissions, and copy the generated **Web App URL**.</li>
          <li>Ensure the copied Web App URL ends with <span className="font-bold text-emerald-700 bg-emerald-50 px-1 font-mono">/exec</span> (NOT <span className="text-red-600 bg-red-50 px-1 font-mono">/edit</span> or <span className="text-red-600 bg-red-50 px-1 font-mono">/dev</span>).</li>
          <li>Paste the URL in the **Settings** tab above and click **Test &amp; Connect**.</li>
        </ol>

        {/* Deployment Troubleshooting Guide */}
        <div className="bg-amber-50/80 border border-amber-300 p-4 space-y-3 rounded-xl font-mono text-xs text-amber-950">
          <div className="flex items-center space-x-2 font-bold uppercase text-[11px] text-amber-900 border-b border-amber-200 pb-2">
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>Having Trouble Deploying or Updating the Web App URL?</span>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed">
            <div>
              <p className="font-bold text-amber-900">1. How to Update Code without changing the URL:</p>
              <p className="text-amber-800 ml-3">In Apps Script editor, click <strong>Deploy &gt; Manage deployments</strong>, click the <strong>Pencil (Edit)</strong> icon, set Version to <strong>New version</strong>, then click <strong>Deploy</strong>.</p>
            </div>

            <div>
              <p className="font-bold text-amber-900">2. How to Create a New Web App URL:</p>
              <p className="text-amber-800 ml-3">Click <strong>Deploy &gt; New deployment</strong> &gt; Gear icon &gt; <strong>Web app</strong>. Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Click <strong>Deploy</strong> and copy the URL ending in <strong>/exec</strong>.</p>
            </div>

            <div>
              <p className="font-bold text-amber-900">3. Google "App Not Verified" Safety Warning:</p>
              <p className="text-amber-800 ml-3">When Google shows "Google hasn't verified this app": Click <strong>Advanced</strong> (bottom left) &rarr; Click <strong>Go to Untitled project (unsafe)</strong> &rarr; Click <strong>Allow</strong>.</p>
            </div>

            <div>
              <p className="font-bold text-amber-900">4. URL Format Check:</p>
              <p className="text-amber-800 ml-3">Correct URL format: <code className="bg-amber-100 px-1 font-bold text-black">https://script.google.com/macros/s/AKfycb.../exec</code></p>
            </div>
          </div>
        </div>

        {/* Visual Google Sheet Tabs & Columns guide */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-black" />
            <h4 className="font-bold text-black uppercase tracking-wider text-xs">
              Spreadsheet Architecture (Tabs &amp; Columns)
            </h4>
          </div>
          <p className="text-xs text-gray-500 leading-normal font-sans">
            The Google Apps Script <span className="font-bold text-black">automatically creates</span> all required tabs and writes the header rows on its first run. If you wish to inspect or create them manually, here is the exact database schema:
          </p>

          <div className="space-y-3">
            {/* Sheet 1: Orders */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  📄 Tab 1: Orders
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Stores primary order entries</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Order ID", "Order Number", "Company Name", "Contact Email", "Contact Person", "Delivery Address", "PO Number", "Total Amount", "Status", "Created At", "Notes"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 2: OrderItems */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  📦 Tab 2: OrderItems
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Stores itemized products ordered</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details", "Selected Add-Ons"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 3: Products */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🏷️ Tab 3: Products
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Master catalog synchronization</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered", "Shipping Fee", "Lead Time", "Image URLs", "Custom Fields", "Add-Ons"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 4: Companies */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🏢 Tab 4: Companies
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Company profiles authentication and product locks</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Delivery Address", "Passcode", "PO Required", "Logo URL", "Approved Products", "Custom Products"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 5: Portals */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🚪 Tab 5: Portals
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Order Portal details and access links</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Portal ID", "Company ID", "Company Name", "Portal Name", "Description", "Status", "Product IDs", "Portal Pricing", "Variant Pricing", "Created At", "Updated At", "Share Token"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 6: AdminSettings */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  ⚙️ Tab 6: Admin
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Global Admin portal configurations</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Hub Name", "Short Hub Name", "Company Tagline", "Company Address", "Tax TIN ID", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme", "Admin Email", "App Logo URL", "App Favicon URL"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 7: Quotes */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  📄 Tab 7: Quotes
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Quote enquiry requests and quotations</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Enquiry ID", "Enquiry Number", "Product ID", "Product Name", "Product Category", "Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Quantity", "Preferred Branding Method", "Preferred Color", "Preferred Size", "Notes", "Status", "Created At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 8: Jobs */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  📋 Tab 8: Jobs
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Job Management board cards and production workflow</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Job ID", "Company ID", "Company Name", "Order ID", "Order Number", "Source", "Status", "Position", "Values JSON", "Items JSON", "Activities JSON", "Created At", "Updated At", "Created By"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 9: JobColumns */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🗂️ Tab 9: JobColumns
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Custom schema columns and field attributes for Jobs</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Options", "Created Date"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 10: JobItemColumns */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  📑 Tab 10: JobItemColumns
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Sub-item schema columns and calculations</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Column ID", "Name", "Type", "Position", "Required", "Is System Field", "Is Hidden", "Calculation", "Options"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 11: Staff */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  👥 Tab 11: Staff
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Employee directory, compensation &amp; status</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Staff ID", "Full Name", "Position", "Department", "Employment Status", "Date Started", "Salary Type", "Basic Salary", "Allowances", "Other Compensation", "Notes", "Status", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 12: Payroll */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  💵 Tab 12: Payroll
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Pay period calculations, earnings &amp; deductions</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Payroll ID", "Staff ID", "Staff Name", "Position", "Department", "Pay Period Start", "Pay Period End", "Pay Date", "Basic Pay", "Allowances", "Other Earnings", "Gross Pay", "Deductions", "Itemized Deductions JSON", "Total Deductions", "Net Pay", "Status", "Notes", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 13: Expenses */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  💳 Tab 13: Expenses
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Fixed, recurring &amp; operational expenses</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Expense ID", "Expense Name", "Category", "Expense Type", "Amount", "Expense Date", "Payment Status", "Payment Date", "Vendor", "Reference Number", "Notes", "Recurring Expense ID", "Payroll ID", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 14: ExpenseCategories */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🏷️ Tab 14: ExpenseCategories
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Expense categories and classification</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Category ID", "Name", "Is System", "Status"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 15: RecurringExpenses */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🔄 Tab 15: RecurringExpenses
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Recurring schedule rules &amp; frequencies</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Recurring Expense ID", "Expense Name", "Category", "Amount", "Frequency", "Start Date", "End Date", "Payments Per Year", "Specific Months JSON", "Status", "Notes", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 16: StaffAccounts */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  🔐 Tab 16: StaffAccounts
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Staff portal logins, roles &amp; security credentials</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Account ID", "Staff ID", "Name", "Username", "Passcode", "Role", "Status", "Email", "Phone", "Avatar URL", "Last Login", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet 17: Attendance */}
            <div className="border border-gray-200 bg-gray-50 p-3 space-y-2 rounded-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-mono text-[11px] font-bold text-black bg-white px-2 py-0.5 border border-black rounded-md">
                  ⏱️ Tab 17: Attendance
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Real-time clock-in/out timestamps, hours &amp; notes</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Column Headers (Row 1):</span>
                <div className="flex flex-wrap gap-1">
                  {["Attendance ID", "Staff ID", "Staff Name", "Date", "Clock In", "Clock Out", "Total Hours", "Status", "Notes", "Created At", "Updated At"].map(col => (
                    <span key={col} className="bg-white border border-gray-100 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-800 font-semibold shadow-xs">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center bg-black text-white px-4 py-2 text-xs uppercase font-mono">
          <span className="flex items-center gap-1.5 font-bold">
            <FileText className="w-3.5 h-3.5" /> Code.gs
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 hover:text-gray-300 transition-colors focus:outline-none"
            title="Copy script code"
            id="copy-script-btn"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="text-xs bg-gray-50 text-gray-800 p-4 rounded-none border border-gray-300 overflow-x-auto max-h-72 font-mono leading-relaxed">
          {appsScriptCode}
        </pre>
      </div>

      <div className="flex items-start gap-2.5 bg-gray-50 p-3.5 border border-black/10 text-xs">
        <HelpCircle className="w-4.5 h-4.5 text-black shrink-0 mt-0.5" />
        <p className="text-gray-600 leading-normal">
          <span className="font-bold text-black uppercase">Offline Fallback:</span> If no App Script Web App URL is configured, the application automatically persists all your products, company profiles, and orders inside your browser's <code className="bg-gray-100 px-1 border border-gray-300 rounded font-mono text-[10px]">localStorage</code>. Your work and data will be fully functional either way!
        </p>
      </div>
    </div>
  );
}
