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
  var sheets = ["Orders", "OrderItems", "Products", "CatalogProducts", "Companies", "Portals", "Admin", "Quotes"];
  
  // Headers definitions
  var headers = {
    "Orders": ["Order ID", "Order Number", "Company Name", "Contact Email", "Contact Person", "Contact Number", "FB Messenger Link", "Delivery Address", "PO Number", "Total Amount", "Status", "Created At", "Notes", "Portal ID", "Portal Name"],
    "OrderItems": ["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details"],
    "Products": ["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered", "Shipping Fee", "Image URLs", "Custom Fields"],
    "CatalogProducts": ["Product ID", "SKU", "Name", "Category", "Description", "Image URL", "Image URLs", "MOQ", "Lead Time", "Branding Methods", "Colors", "Sizes", "Status"],
    "Companies": ["Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Delivery Address", "Username", "Passcode", "PO Required", "Logo URL", "Approved Products", "Custom Products"],
    "Portals": ["Portal ID", "Company ID", "Company Name", "Portal Name", "Description", "Status", "Product IDs", "Portal Pricing", "Variant Pricing", "Created At", "Updated At", "Share Token"],
    "Admin": ["Hub Name", "Short Hub Name", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme", "Admin Email", "App Logo URL"],
    "Quotes": ["Enquiry ID", "Enquiry Number", "Product ID", "Product Name", "Product Category", "Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Quantity", "Preferred Branding Method", "Preferred Color", "Preferred Size", "Notes", "Status", "Created At", "Quoted Unit Price", "Quoted Total Price", "Quoted Tax", "Quoted Shipping", "Quote Notes", "Quoted Valid Until", "Quoted At", "Quoted Line Items", "Requested Product Addition", "Requested Product Addition At", "Requested Product Notes"]
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
}

function getTableData(ss, sheetName) {
  var s = ss.getSheetByName(sheetName);
  var values = s.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var list = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c].replace(/\s+/g, "")] = row[c];
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
      orderNumber: order.OrderNumber || order["Order Number"],
      companyName: order.CompanyName || order["Company Name"],
      contactEmail: order.ContactEmail || order["Contact Email"],
      contactPerson: order.ContactPerson || order["Contact Person"],
      contactNumber: order.ContactNumber || order["Contact Number"] || "",
      fbMessengerLink: order.FBMessengerLink || order["FB Messenger Link"] || "",
      deliveryAddress: order.DeliveryAddress || order["Delivery Address"],
      poNumber: order.PONumber || order["PO Number"] || "",
      totalAmount: Number(order.TotalAmount || order["Total Amount"]),
      status: order.Status || "Pending Approval",
      createdAt: order.CreatedAt || order["Created At"],
      notes: order.Notes || "",
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
  
  var expectedItemsHeaders = ["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details"];
  var itemsData = ensureHeaders(itemsSheet, expectedItemsHeaders);
  var itemsHeaders = itemsData[0];
  
  order.items.forEach(function(item) {
    var detailsStr = "";
    if (item.customDetails) {
      detailsStr = JSON.stringify(item.customDetails);
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
      "Custom Details": detailsStr
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
  var expectedHeaders = ["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered", "Shipping Fee", "Lead Time", "Image URLs", "Custom Fields"];
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
    "Custom Fields": customFieldsStr
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
  var expectedHeaders = ["Portal ID", "Company ID", "Company Name", "Portal Name", "Description", "Status", "Product IDs", "Portal Pricing", "Variant Pricing", "Created At", "Updated At", "Share Token"];
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
  var expectedHeaders = ["Hub Name", "Short Hub Name", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme", "Admin Email", "App Logo URL"];
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
    "Order Prefix": settings.orderPrefix,
    "Currency Symbol": settings.currencySymbol,
    "Admin Username": adminUser || "admin",
    "Admin Passcode": adminPass || "1234",
    "Color Theme": settings.colorTheme || "classic_noir",
    "Admin Email": settings.adminEmail || "",
    "App Logo URL": settings.logoUrl || ""
  };
  
  var rowData = [];
  for (var c = 0; c < headers.length; c++) {
    rowData.push(getMapValueByHeader(adminMap, headers[c]));
  }
  
  sheet.appendRow(rowData);
  return { status: "success" };
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
            The Google Apps Script <span className="font-bold text-black">automatically creates</span> these 5 tabs and writes the header rows on its first run. If you wish to inspect or create them manually, here is the exact database schema:
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
                  {["Order ID", "Product ID", "Product Name", "Image URL", "Quantity", "Price", "Selected Size", "Selected Color", "Custom Details"].map(col => (
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
                  {["Product ID", "Name", "Category", "Description", "Image URL", "Base Price", "Original Price", "Min Quantity", "Unit", "Size Options", "Color Options", "Frequently Ordered"].map(col => (
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
                  {["Company ID", "Company Name", "Contact Person", "Contact Email", "Contact Phone", "Delivery Address", "Passcode", "PO Required", "Logo URL", "Approved Products"].map(col => (
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
                  {["Hub Name", "Short Hub Name", "Order Prefix", "Currency Symbol", "Admin Username", "Admin Passcode", "Color Theme"].map(col => (
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
