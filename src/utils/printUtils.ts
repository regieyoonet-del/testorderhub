/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function printElement(element: HTMLElement | null, documentTitle: string = 'Official Quotation') {
  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.error('Direct window.print() failed:', e);
    }
    return;
  }

  // Check if we are inside an iframe
  const isIframe = window.self !== window.top;

  if (isIframe) {
    try {
      // Approach: Create a hidden iframe, write styled element HTML, and trigger print on iframe
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (doc) {
        // Collect existing styles
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${documentTitle}</title>
              ${styles}
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .printable-area {
                  border: 1px solid #000000 !important;
                  border-radius: 16px !important;
                  padding: 24px !important;
                  margin: 0 auto !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                }
                button, .no-print {
                  display: none !important;
                }
                @media print {
                  body {
                    padding: 0;
                  }
                  @page {
                    size: auto;
                    margin: 15mm;
                  }
                }
              </style>
            </head>
            <body>
              <div class="printable-area">
                ${element.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print failed, falling back to window.print()', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(printIframe)) {
                document.body.removeChild(printIframe);
              }
            }, 3000);
          }
        }, 400);
        return;
      }
    } catch (err) {
      console.warn('Error during iframe printing, falling back to window.print()', err);
    }
  }

  // Default direct print flow
  const oldTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  try {
    window.print();
  } catch (error) {
    console.error('Window print error:', error);
  } finally {
    setTimeout(() => {
      document.title = oldTitle;
    }, 1500);
  }
}

