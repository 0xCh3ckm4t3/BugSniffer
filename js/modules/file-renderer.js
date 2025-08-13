/**
 * File Renderer Module
 * Handles rendering of JavaScript files list
 */

import { DOMUtils } from './dom-utils.js';
import { URLManager } from './url-manager.js';
import { ToastManager } from './toast-manager.js';

export class FileRenderer {
  constructor(currentDomain) {
    this.currentDomain = currentDomain;
  }

  /**
   * Render the file list
   * @param {string[]} urls - Array of JavaScript file URLs
   * @param {boolean} enabled - Extension enabled state
   */
  render(urls, enabled = true) {
    const listElement = DOMUtils.getElement('list');
    const emptyElement = DOMUtils.getElement('empty');
    const copyBtn = DOMUtils.getElement('copy');
    const downloadBtn = DOMUtils.getElement('download');

    // Handle disabled state
    if (!enabled) {
      listElement.innerHTML = '';
      DOMUtils.show(emptyElement);
      DOMUtils.setDisabled(copyBtn, true);
      DOMUtils.setDisabled(downloadBtn, true);
      return;
    }

    // Handle empty list
    if (!urls || !urls.length) {
      listElement.innerHTML = '';
      DOMUtils.show(emptyElement);
      DOMUtils.setDisabled(copyBtn, true);
      DOMUtils.setDisabled(downloadBtn, true);
      return;
    }

    // Render files
    DOMUtils.hide(emptyElement);
    DOMUtils.setDisabled(copyBtn, false);
    DOMUtils.setDisabled(downloadBtn, false);

    const fileItems = urls.map(url => this.createFileItem(url)).join('');
    listElement.innerHTML = fileItems;

    // Add click-to-copy functionality
    this.attachClickHandlers();
  }

  /**
   * Create HTML for a single file item
   * @param {string} url - File URL
   * @returns {string} - HTML string
   */
  createFileItem(url) {
    const filename = URLManager.getFilename(url);
    const itemDomain = URLManager.getDomain(url) || 'unknown';
    const isExternal = URLManager.isExternal(url, this.currentDomain);

    return `
      <div class="js-url" data-url="${url}" title="Click to copy: ${url}">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #333;">
              ${filename}
            </div>
            <div style="font-size: 11px; color: #6c757d; margin-bottom: 2px;">
              ${isExternal ? '🌐 External' : '🏠 Local'} • ${itemDomain}
            </div>
            <div style="font-size: 10px; color: #adb5bd; word-break: break-all;">
              ${url}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach click handlers to file items
   */
  attachClickHandlers() {
    const items = DOMUtils.getElements('.js-url');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          ToastManager.success('URL copied to clipboard!');
        }).catch(() => {
          ToastManager.error('Failed to copy URL');
        });
      });
    });
  }

  /**
   * Get all rendered URLs
   * @returns {string[]} - Array of URLs
   */
  getAllUrls() {
    const items = DOMUtils.getElements('.js-url');
    return Array.from(items).map(item => item.dataset.url);
  }
}
