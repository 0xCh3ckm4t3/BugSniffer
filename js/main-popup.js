/**
 * Main Popup Application - Clean Modular Version
 * Orchestrates all modules and handles main application logic
 */

// Import modules using relative paths
import { DOMUtils } from './modules/dom-utils.js';
import { StorageManager } from './modules/storage.js';
import { URLManager } from './modules/url-manager.js';
import { ToastManager } from './modules/toast-manager.js';
import { FileRenderer } from './modules/file-renderer.js';
import { StatsManager } from './modules/stats-manager.js';

class PopupApp {
  constructor() {
    this.currentDomain = null;
    this.enabled = true;
    this.fileRenderer = null;
    this.refreshInterval = null;
  }

  /**
   * Initialize the popup application
   */
  async init() {
    try {
      // Get current domain
      this.currentDomain = await URLManager.getCurrentDomain();
      
      // Initialize UI components
      await this.initializeUI();
      
      // Initialize file renderer
      this.fileRenderer = new FileRenderer(this.currentDomain);
      
      // Load initial data
      await this.loadInitialData();
      
      // Start refresh interval
      this.startRefreshInterval();
    } catch (error) {
      console.error('❌ Failed to initialize PopupApp:', error);
      console.error('Error stack:', error.stack);
      
      // Show a user-friendly error
      const errorEl = document.createElement('div');
      errorEl.style.cssText = 'color: red; padding: 10px; background: #fee; border: 1px solid red; margin: 10px;';
      errorEl.innerHTML = `<strong>Initialization Error:</strong><br>${error.message}`;
      document.body.prepend(errorEl);
      
      ToastManager?.error?.('Failed to initialize extension') || 
        alert('Failed to initialize extension: ' + error.message);
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    try {
      // Update domain display
      DOMUtils.setText('current-domain', this.currentDomain || 'unknown');

      // Set up event listeners
      this.setupEventListeners();

      // Initialize enabled state
      this.enabled = await StorageManager.isEnabled();
      
      this.updateEnabledState();
    } catch (error) {
      console.error('❌ UI initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load initial data and render
   */
  async loadInitialData() {
    if (!this.currentDomain) {
      this.fileRenderer?.render([], this.enabled);
      await StatsManager.updateAll(0);
      return;
    }

    try {
      const urls = await StorageManager.getJSFiles(this.currentDomain);
      this.fileRenderer?.render(urls, this.enabled);
      await StatsManager.updateAll(urls.length);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      ToastManager.error('Failed to load data');
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Enable/disable toggle
    const enableToggle = DOMUtils.getElement('enable-toggle');
    if (enableToggle) {
      enableToggle.addEventListener('change', () => this.handleToggleChange());
    }

    // Copy all button
    const copyBtn = DOMUtils.getElement('copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.handleCopyAll());
    }

    // Download button
    const downloadBtn = DOMUtils.getElement('download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleDownload());
    }

    // Clear all button
    const clearBtn = DOMUtils.getElement('clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClear());
    }
  }

  /**
   * Handle enable/disable toggle change
   */
  async handleToggleChange() {
    try {
      const enableToggle = DOMUtils.getElement('enable-toggle');
      const newState = enableToggle?.checked || false;
      
      await StorageManager.setEnabled(newState);
      this.enabled = newState;
      this.updateEnabledState();
      
      ToastManager.info(newState ? 'Extension enabled' : 'Extension disabled');
      
      // Reload data with new state
      await this.loadInitialData();
    } catch (error) {
      console.error('Failed to update enabled state:', error);
      ToastManager.error('Failed to update settings');
    }
  }

  /**
   * Update UI based on enabled state
   */
  updateEnabledState() {
    const enableToggle = DOMUtils.getElement('enable-toggle');
    if (enableToggle) {
      enableToggle.checked = this.enabled;
    }
  }

  /**
   * Handle copy all button click
   */
  async handleCopyAll() {
    if (!this.currentDomain) {
      ToastManager.error('No domain selected');
      return;
    }

    try {
      const urls = await StorageManager.getJSFiles(this.currentDomain);
      
      if (!urls || urls.length === 0) {
        ToastManager.warning('No JavaScript files to copy');
        return;
      }

      await navigator.clipboard.writeText(urls.join('\n'));
      ToastManager.success(`Copied ${urls.length} URLs to clipboard`);
    } catch (error) {
      console.error('Failed to copy URLs:', error);
      ToastManager.error('Failed to copy URLs');
    }
  }

  /**
   * Handle download button click
   */
  async handleDownload() {
    if (!this.currentDomain) {
      ToastManager.error('No domain selected');
      return;
    }

    try {
      const urls = await StorageManager.getJSFiles(this.currentDomain);
      
      if (!urls || urls.length === 0) {
        ToastManager.warning('No JavaScript files to download');
        return;
      }

      const filename = `js-files-${this.currentDomain}-${Date.now()}.txt`;
      const content = urls.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
      
      ToastManager.success(`Downloaded ${urls.length} URLs`);
    } catch (error) {
      console.error('Failed to download URLs:', error);
      ToastManager.error('Failed to download URLs');
    }
  }

  /**
   * Handle clear button click
   */
  async handleClear() {
    if (!this.currentDomain) {
      ToastManager.error('No domain to clear');
      return;
    }

    const confirmed = confirm(`Clear all JavaScript files for ${this.currentDomain}?`);
    if (!confirmed) return;

    try {
      await StorageManager.remove([this.currentDomain]);
      this.fileRenderer?.render([], this.enabled);
      await StatsManager.updateAll(0);
      ToastManager.info('Files cleared!');
    } catch (error) {
      console.error('Failed to clear files:', error);
      ToastManager.error('Failed to clear files');
    }
  }

  /**
   * Start refresh interval to check for new files
   */
  startRefreshInterval() {
    this.refreshInterval = setInterval(async () => {
      if (!this.currentDomain) return;

      try {
        const urls = await StorageManager.getJSFiles(this.currentDomain);
        const currentCount = this.fileRenderer?.getAllUrls().length || 0;
        
        if (urls.length !== currentCount) {
          this.fileRenderer?.render(urls, this.enabled);
          await StatsManager.updateAll(urls.length);
        }
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  app.init();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    app.destroy();
  });
});
