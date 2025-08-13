// ===== UI STATE MANAGER =====
import { showToast } from './utils.js';

class UIState {
  constructor() {
    this.enabled = true;
    this.currentDomain = null;
    this.jsFiles = [];
  }

  /**
   * Initialize the extension state
   */
  async initialize() {
    await this.loadEnabledState();
    this.setupToggleListener();
  }

  /**
   * Load enabled state from storage
   */
  async loadEnabledState() {
    return new Promise(resolve => {
      chrome.storage.local.get(['bugsniffer_enabled'], data => {
        this.setEnabled(data.bugsniffer_enabled !== false);
        resolve();
      });
    });
  }

  /**
   * Set enabled state
   */
  setEnabled(state) {
    this.enabled = state;
    const toggle = document.getElementById('enable-toggle');
    if (toggle) {
      toggle.checked = state;
    }
    
    // Apply UI state
    document.body.classList.toggle('disabled', !state);
    
    // Save to storage
    chrome.storage.local.set({ bugsniffer_enabled: state });
  }

  /**
   * Setup toggle event listener
   */
  setupToggleListener() {
    const toggle = document.getElementById('enable-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        this.setEnabled(toggle.checked);
        showToast(
          toggle.checked ? 'Extension enabled' : 'Extension disabled', 
          'info'
        );
      });
    }
  }

  /**
   * Set current domain
   */
  setCurrentDomain(domain) {
    this.currentDomain = domain;
    const domainElement = document.getElementById('current-domain');
    if (domainElement) {
      domainElement.textContent = domain || 'Invalid page';
    }
  }

  /**
   * Set JS files data
   */
  setJSFiles(files) {
    this.jsFiles = files || [];
  }

  /**
   * Check if extension is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current domain
   */
  getCurrentDomain() {
    return this.currentDomain;
  }

  /**
   * Get JS files
   */
  getJSFiles() {
    return this.jsFiles;
  }
}

export default UIState;
