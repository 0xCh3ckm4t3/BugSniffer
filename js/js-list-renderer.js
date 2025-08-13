// ===== JS LIST RENDERER =====
import { showToast } from './utils.js';

class JSListRenderer {
  constructor() {
    this.listContainer = document.getElementById('list');
    this.emptyState = document.getElementById('empty');
  }

  /**
   * Render the JS files list
   */
  render(urls, currentDomain, enabled = true) {
    if (!enabled) {
      this.renderEmpty();
      return;
    }

    if (!urls || !urls.length) {
      this.renderEmpty();
      return;
    }

    this.renderFiles(urls, currentDomain);
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    if (this.listContainer) {
      this.listContainer.innerHTML = '';
    }
    if (this.emptyState) {
      this.emptyState.style.display = 'flex';
    }
  }

  /**
   * Render files list
   */
  renderFiles(urls, currentDomain) {
    if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }

    if (!this.listContainer) return;

    const items = urls.map(url => this.createFileItem(url, currentDomain)).join('');
    this.listContainer.innerHTML = items;

    // Add click handlers
    this.setupClickHandlers();
  }

  /**
   * Create individual file item HTML
   */
  createFileItem(url, currentDomain) {
    const filename = this.extractFilename(url);
    const { domain: itemDomain, isExternal } = this.analyzeURL(url, currentDomain);

    return `
      <div class="js-item" data-url="${this.escapeHtml(url)}" title="Click to copy: ${this.escapeHtml(url)}">
        <div class="js-item-content">
          <div class="js-url">${this.escapeHtml(filename)}</div>
          <div class="js-info">
            <span class="js-tag ${isExternal ? 'type-external' : 'type-local'}">
              ${isExternal ? '🌐 External' : '🏠 Local'}
            </span>
            <span class="js-tag source-network">${this.escapeHtml(itemDomain)}</span>
          </div>
          <div class="js-url" style="font-size: 0.8em; opacity: 0.7;">
            ${this.escapeHtml(url)}
          </div>
        </div>
        <div class="copy-indicator">Copied!</div>
      </div>
    `;
  }

  /**
   * Setup click handlers for file items
   */
  setupClickHandlers() {
    const items = this.listContainer?.querySelectorAll('.js-item');
    if (!items) return;

    items.forEach(item => {
      item.addEventListener('click', async () => {
        const url = item.dataset.url;
        if (!url) return;

        try {
          await navigator.clipboard.writeText(url);
          
          // Show visual feedback
          const indicator = item.querySelector('.copy-indicator');
          if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => {
              indicator.classList.remove('show');
            }, 1500);
          }
          
          showToast('URL copied to clipboard!');
        } catch (error) {
          showToast('Failed to copy URL', 'error');
        }
      });
    });
  }

  /**
   * Extract filename from URL
   */
  extractFilename(url) {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'unknown.js';
    } catch {
      return 'unknown.js';
    }
  }

  /**
   * Analyze URL and determine if it's external
   */
  analyzeURL(url, currentDomain) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      return {
        domain,
        isExternal: domain !== currentDomain
      };
    } catch {
      return {
        domain: 'unknown',
        isExternal: false
      };
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get current URLs from rendered list
   */
  getCurrentURLs() {
    const items = this.listContainer?.querySelectorAll('.js-item');
    if (!items) return [];
    
    return Array.from(items).map(item => item.dataset.url).filter(Boolean);
  }
}

export default JSListRenderer;
