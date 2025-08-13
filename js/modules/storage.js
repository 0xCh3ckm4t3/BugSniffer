/**
 * Storage Manager Module
 * Handles all Chrome storage operations
 */

export class StorageManager {
  /**
   * Get data from Chrome storage
   * @param {string|string[]|null} keys - Keys to retrieve
   * @returns {Promise<Object>}
   */
  static async get(keys = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  /**
   * Set data in Chrome storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  /**
   * Remove keys from Chrome storage
   * @param {string|string[]} keys - Keys to remove
   * @returns {Promise<void>}
   */
  static async remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }

  /**
   * Get extension enabled state
   * @returns {Promise<boolean>}
   */
  static async isEnabled() {
    const data = await this.get(['bugsniffer_enabled']);
    return data.bugsniffer_enabled !== false; // Default to enabled
  }

  /**
   * Set extension enabled state
   * @param {boolean} enabled - Enable/disable state
   * @returns {Promise<void>}
   */
  static async setEnabled(enabled) {
    return this.set({ bugsniffer_enabled: enabled });
  }

  /**
   * Get JS files for a domain
   * @param {string} domain - Domain to get files for
   * @returns {Promise<string[]>}
   */
  static async getJSFiles(domain) {
    const data = await this.get([domain]);
    return data[domain] || [];
  }

  /**
   * Get stats for all domains
   * @returns {Promise<{domainCount: number, totalFiles: number}>}
   */
  static async getAllStats() {
    const data = await this.get(null);
    const domains = Object.keys(data).filter(key => Array.isArray(data[key]));
    const totalFiles = domains.reduce((sum, domain) => sum + data[domain].length, 0);
    return { domainCount: domains.length, totalFiles };
  }
}
