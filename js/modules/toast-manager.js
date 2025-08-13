/**
 * Toast Manager Module
 * Handles toast notifications with different types
 */

import { DOMUtils } from './dom-utils.js';

export class ToastManager {
  static TYPES = {
    SUCCESS: 'success',
    INFO: 'info',
    ERROR: 'error'
  };

  static DURATION = 2000; // 2 seconds

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type (success, info, error)
   * @param {number} duration - Duration in milliseconds
   */
  static show(message, type = this.TYPES.SUCCESS, duration = this.DURATION) {
    const toast = DOMUtils.getElement('toast');
    if (!toast) {
      console.error('Toast element not found');
      return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    // Auto-hide after duration
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /**
   * Show success toast
   * @param {string} message - Success message
   */
  static success(message) {
    this.show(message, this.TYPES.SUCCESS);
  }

  /**
   * Show info toast
   * @param {string} message - Info message
   */
  static info(message) {
    this.show(message, this.TYPES.INFO);
  }

  /**
   * Show error toast
   * @param {string} message - Error message
   */
  static error(message) {
    this.show(message, this.TYPES.ERROR);
  }
}
