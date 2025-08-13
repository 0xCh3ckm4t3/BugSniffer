/**
 * Main Popup Application
 * Orchestrates all modules and handles main application logic
 */

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
    this.statsManager = new StatsManager();
    this.jsListRenderer = new JSListRenderer();
    this.actionHandlers = new ActionHandlers(this.jsListRenderer);
    
    this.refreshData = debounce(this.refreshData.bind(this), 500);
  }

  /**
   * Initialize the application
   */
  async init() {
    await this.uiState.initialize();
    this.setupEventListeners();
    this.loadCurrentDomain();
    this.startPeriodicRefresh();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for data changes
    window.addEventListener('dataChanged', () => {
      this.refreshData();
    });

    // Listen for refresh requests
    window.addEventListener('refreshRequested', () => {
      this.refreshData();
    });
  }

  /**
   * Load current domain and its data
   */
  loadCurrentDomain() {
    getDomain(domain => {
      this.uiState.setCurrentDomain(domain);

      if (!domain) {
        this.renderEmptyState();
        return;
      }

      this.loadDomainData(domain);
    });
  }

  /**
   * Load data for a specific domain
   */
  loadDomainData(domain) {
    chrome.storage.local.get([domain], data => {
      const urls = data[domain] || [];
      this.uiState.setJSFiles(urls);
      this.renderData(urls);
    });
  }

  /**
   * Render data to UI
   */
  renderData(urls) {
    const enabled = this.uiState.isEnabled();
    const currentDomain = this.uiState.getCurrentDomain();

    // Update stats
    this.statsManager.updateStats(enabled ? urls.length : 0);

    // Render JS list
    this.jsListRenderer.render(urls, currentDomain, enabled);

    // Update button states
    this.actionHandlers.updateButtonStates(urls.length > 0, enabled);
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    this.statsManager.resetStats();
    this.jsListRenderer.renderEmpty();
    this.actionHandlers.updateButtonStates(false, this.uiState.isEnabled());
  }

  /**
   * Refresh current data
   */
  refreshData() {
    const currentDomain = this.uiState.getCurrentDomain();
    if (currentDomain) {
      this.loadDomainData(currentDomain);
    }
  }

  /**
   * Start periodic refresh to catch new files
   */
  startPeriodicRefresh() {
    setInterval(() => {
      const currentDomain = this.uiState.getCurrentDomain();
      if (!currentDomain) return;

      chrome.storage.local.get([currentDomain], data => {
        const newUrls = data[currentDomain] || [];
        const currentUrls = this.uiState.getJSFiles();

        // Only update if there's a change
        if (newUrls.length !== currentUrls.length) {
          this.uiState.setJSFiles(newUrls);
          this.renderData(newUrls);
        }
      });
    }, 2000);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  app.init().catch(error => {
    console.error('Failed to initialize popup app:', error);
  });
});
