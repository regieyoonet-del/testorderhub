/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function printElement(_element: HTMLElement | null, documentTitle: string = 'Official Quotation') {
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
    }, 1000);
  }
}

