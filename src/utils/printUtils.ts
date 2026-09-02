/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Escapes strings for safe injection into HTML templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Prints a DOM element or falls back to full window print,
 * ensuring all CSS styles, fonts, images, and layout rules
 * are fully rendered without blank sheets.
 */
export function printElement(element: HTMLElement | null, documentTitle: string = 'Official Document') {
  const safeTitle = escapeHtml(documentTitle);

  // Fallback to direct window.print() if no specific element was supplied
  if (!element) {
    const oldTitle = document.title;
    if (documentTitle) document.title = documentTitle;
    try {
      window.print();
    } catch (e) {
      console.error('Direct window.print() failed:', e);
    } finally {
      setTimeout(() => {
        document.title = oldTitle;
      }, 1000);
    }
    return;
  }

  try {
    // 1. Remove any leftover print iframe from previous invocations
    const existingFrame = document.getElementById('app-print-sandbox-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    // 2. Create an isolated print iframe with realistic viewport dimensions so CSS layouts compute correctly
    const printIframe = document.createElement('iframe');
    printIframe.id = 'app-print-sandbox-frame';
    printIframe.style.position = 'fixed';
    printIframe.style.top = '0';
    printIframe.style.left = '0';
    printIframe.style.width = '100vw';
    printIframe.style.height = '100vh';
    printIframe.style.border = 'none';
    printIframe.style.opacity = '0';
    printIframe.style.pointerEvents = 'none';
    printIframe.style.zIndex = '-999999';

    document.body.appendChild(printIframe);

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Unable to access print iframe document');
    }

    // 3. Collect all active style and stylesheet link elements from the parent application
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    // 4. Construct complete self-contained printable HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${safeTitle}</title>
          <base href="${window.location.origin}/" />
          ${styleElements}
          <style>
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              width: 100% !important;
              min-height: 100% !important;
              overflow: visible !important;
              visibility: visible !important;
            }
            body * {
              visibility: visible !important;
            }
            button, .no-print, [role="button"] {
              display: none !important;
            }
            .print-outer-wrapper {
              padding: 16px;
              width: 100%;
              max-width: 900px;
              margin: 0 auto;
              background: #ffffff !important;
            }
            .printable-area {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              margin: 0 auto !important;
              max-width: 100% !important;
              width: 100% !important;
              box-shadow: none !important;
              border-color: #000000 !important;
              overflow: visible !important;
              page-break-inside: avoid;
            }
            @page {
              size: auto;
              margin: 12mm;
            }
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-outer-wrapper {
                padding: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-outer-wrapper">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // 5. Wait for all resources (images, fonts, stylesheets) inside the iframe to finish rendering
    const executePrint = () => {
      try {
        const win = printIframe.contentWindow;
        if (win) {
          win.focus();
          win.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        const oldTitle = document.title;
        if (documentTitle) document.title = documentTitle;
        window.print();
        setTimeout(() => {
          document.title = oldTitle;
        }, 1000);
      } finally {
        setTimeout(() => {
          if (printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe);
          }
        }, 2000);
      }
    };

    // Check images inside iframe
    const images = Array.from(iframeDoc.images);
    const uncompletedImages = images.filter(img => !img.complete);

    if (uncompletedImages.length > 0) {
      let loadedCount = 0;
      const onImgDone = () => {
        loadedCount++;
        if (loadedCount >= uncompletedImages.length) {
          setTimeout(executePrint, 150);
        }
      };

      uncompletedImages.forEach(img => {
        img.onload = onImgDone;
        img.onerror = onImgDone;
      });

      // Safety timeout in case an image hangs
      setTimeout(executePrint, 600);
    } else {
      setTimeout(executePrint, 250);
    }

  } catch (error) {
    console.warn('Error preparing print document, falling back to window.print():', error);
    const oldTitle = document.title;
    if (documentTitle) document.title = documentTitle;
    try {
      window.print();
    } catch (e) {
      console.error('Fallback window.print() failed:', e);
    } finally {
      setTimeout(() => {
        document.title = oldTitle;
      }, 1000);
    }
  }
}


