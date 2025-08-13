/**
 * URL Manager Module
 * Handles URL parsing, validation, and domain extraction
 */

export class URLManager {
  /**
   * Extract domain from URL
   * @param {string} url - URL to parse
   * @returns {string|null} - Domain or null if invalid
   */
  static getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Get current tab domain
   * @returns {Promise<string|null>}
   */
  static async getCurrentDomain() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        try {
          const url = new URL(tabs[0].url);
          resolve(url.hostname);
        } catch {
          resolve(null);
        }
      });
    });
  }

  /**
   * Check if URL is a JavaScript file
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  static isJavaScriptFile(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname || '';
      return /\.(m?js)$/i.test(pathname);
    } catch {
      try {
        const abs = new URL(url, window.location?.href);
        return /\.(m?js)$/i.test(abs.pathname || '');
      } catch {
        return false;
      }
    }
  }

  /**
   * Convert relative URL to absolute
   * @param {string} url - URL to convert
   * @param {string} baseUrl - Base URL (optional)
   * @returns {string|null}
   */
  static toAbsolute(url, baseUrl = window.location?.href) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * Extract filename from URL
   * @param {string} url - URL to parse
   * @returns {string}
   */
  static getFilename(url) {
    try {
      return url.split('/').pop() || 'unknown.js';
    } catch {
      return 'unknown.js';
    }
  }

  /**
   * Check if URL is external to current domain
   * @param {string} url - URL to check
   * @param {string} currentDomain - Current domain
   * @returns {boolean}
   */
  static isExternal(url, currentDomain) {
    try {
      const urlDomain = this.getDomain(url);
      return urlDomain !== currentDomain;
    } catch {
      return false;
    }
  }
}
