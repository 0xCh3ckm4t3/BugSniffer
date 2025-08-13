/**
 * Stats Manager Module
 * Handles statistics display and updates
 */

import { DOMUtils } from './dom-utils.js';
import { StorageManager } from './storage.js';

export class StatsManager {
  /**
   * Update file count display
   * @param {number} count - Number of files
   */
  static updateFileCount(count) {
    const fileCountElement = DOMUtils.getElement('file-count');
    if (fileCountElement) {
      DOMUtils.setContent(fileCountElement, count.toString());
    }
  }

  /**
   * Update domain count display
   */
  static async updateDomainCount() {
    try {
      const stats = await StorageManager.getAllStats();
      const domainCountElement = DOMUtils.getElement('domain-count');
      if (domainCountElement) {
        DOMUtils.setContent(domainCountElement, stats.domainCount.toString());
      }
    } catch (error) {
      console.error('Failed to update domain count:', error);
    }
  }

  /**
   * Update all stats displays
   * @param {number} fileCount - Current file count
   */
  static async updateAll(fileCount) {
    this.updateFileCount(fileCount);
    await this.updateDomainCount();
  }
}
