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
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start refresh interval
      this.startRefreshInterval();
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      ToastManager.error('Failed to initialize extension');
    }
  }

  /**
   * Initialize UI elements and states
   */
  async initializeUI() {
    // Update domain display
    const domainElement = DOMUtils.getElement('current-domain');
    if (domainElement) {
      DOMUtils.setContent(domainElement, this.currentDomain || 'Invalid page');
    }

    // Initialize enabled state
    this.enabled = await StorageManager.isEnabled();
    this.updateEnabledState();
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

    // Clear button
    const clearBtn = DOMUtils.getElement('clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClear());
    }
  }
      this.handleDownload();
    });

    this.elements.refreshBtn.addEventListener('click', () => {
      this.handleRefresh();
    });

    // Clear functionality (will be added when needed)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleRefresh();
      }
    });
  }

  /**
   * Initialize the popup application
   */
  async initialize() {
    try {
      await this.loadEnabledState();
      await this.loadCurrentDomain();
      await this.loadAndRenderFiles();
      this.startRefreshInterval();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showToast('Failed to initialize extension', 'error');
    }
  }

  /**
   * Load extension enabled state from storage
   */
  async loadEnabledState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bugsniffer_enabled'], (data) => {
        const enabled = data.bugsniffer_enabled !== false; // default enabled
        this.setEnabledState(enabled);
        resolve();
      });
    });
  }

  /**
   * Set the enabled/disabled state and update UI
   */
  setEnabledState(enabled) {
    this.enabled = enabled;
    this.elements.enableToggle.checked = enabled;
    this.elements.container.classList.toggle('disabled', !enabled);
  }

  /**
   * Handle toggle state change
   */
  handleToggleChange() {
    const enabled = this.elements.enableToggle.checked;
    chrome.storage.local.set({ bugsniffer_enabled: enabled });
    this.setEnabledState(enabled);
    this.showToast(enabled ? 'Extension enabled' : 'Extension disabled', 'info');
    
    if (enabled) {
      this.loadAndRenderFiles();
    } else {
      this.renderFiles([]);
    }
  }

  /**
   * Get current domain from active tab
   */
  async loadCurrentDomain() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        try {
          const url = new URL(tabs[0].url);
          this.currentDomain = url.hostname;
          this.elements.currentDomain.textContent = this.currentDomain;
        } catch {
          this.currentDomain = null;
          this.elements.currentDomain.textContent = 'Invalid page';
        }
        resolve();
      });
    });
  }

  /**
   * Get all stored domains and their file counts for stats
   */
  async getAllDomainStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        const domains = Object.keys(data).filter(key => 
          Array.isArray(data[key]) || (data[key] && data[key].files)
        );
        
        let totalFiles = 0;
        domains.forEach(domain => {
          const domainData = data[domain];
          if (Array.isArray(domainData)) {
            totalFiles += domainData.length;
          } else if (domainData && domainData.files) {
            totalFiles += domainData.files.length;
          }
        });
        
        resolve({ domainCount: domains.length, totalFiles });
      });
    });
  }

  /**
   * Update the statistics display
   */
  async updateStats(fileCount) {
    this.elements.fileCount.textContent = fileCount;
    
    try {
      const stats = await this.getAllDomainStats();
      this.elements.domainCount.textContent = stats.domainCount;
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  /**
   * Load files from storage and render them
   */
  async loadAndRenderFiles() {
    if (!this.currentDomain) {
      this.renderFiles([]);
      return;
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([this.currentDomain], (data) => {
        const domainData = data[this.currentDomain];
        let files = [];
        
        if (Array.isArray(domainData)) {
          // Legacy format
          files = domainData;
        } else if (domainData && domainData.files) {
          // New format
          files = domainData.files.map(file => file.url || file);
        }
        
        this.renderFiles(files);
        resolve();
      });
    });
  }

  /**
   * Render the file list
   */
  renderFiles(urls) {
    if (!this.enabled) {
      this.showEmptyState();
      this.updateButtons(false);
      this.updateStats(0);
      return;
    }

    if (!urls || urls.length === 0) {
      this.showEmptyState();
      this.updateButtons(false);
      this.updateStats(0);
      return;
    }

    this.hideEmptyState();
    this.updateButtons(true);
    this.updateStats(urls.length);

    // Clear existing list
    this.elements.jsList.innerHTML = '';

    // Render each file
    urls.forEach((url, index) => {
      const listItem = this.createFileListItem(url, index);
      this.elements.jsList.appendChild(listItem);
      
      // Animate item appearance
      setTimeout(() => {
        listItem.style.opacity = '1';
        listItem.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  /**
   * Create a file list item element
   */
  createFileListItem(url, index) {
    const li = document.createElement('li');
    li.className = 'js-item';
    li.style.opacity = '0';
    li.style.transform = 'translateY(10px)';
    li.style.transition = `all 0.3s ease ${index * 0.05}s`;
    li.tabIndex = 0;
    li.setAttribute('data-url', url);
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Copy URL: ${url}`);

    const content = document.createElement('div');
    content.className = 'js-item-content';

    const urlElement = document.createElement('div');
    urlElement.className = 'js-url';
    urlElement.textContent = url;

    const info = document.createElement('div');
    info.className = 'js-info';

    // Add file type and domain info
    const { filename, isExternal, domain } = this.parseUrlInfo(url);
    
    // Add tags
    if (isExternal) {
      info.appendChild(this.createTag('External', 'type-external'));
    } else {
      info.appendChild(this.createTag('Local', 'type-inline'));
    }
    
    if (domain && domain !== this.currentDomain) {
      info.appendChild(this.createTag(domain, 'source-network'));
    }

    content.appendChild(urlElement);
    content.appendChild(info);
    li.appendChild(content);

    // Add click handlers
    li.addEventListener('click', () => this.copyToClipboard(url));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.copyToClipboard(url);
      }
    });

    return li;
  }

  /**
   * Parse URL information
   */
  parseUrlInfo(url) {
    try {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'unknown.js';
      const domain = urlObj.hostname;
      const isExternal = domain !== this.currentDomain;
      
      return { filename, isExternal, domain };
    } catch {
      return { filename: 'unknown.js', isExternal: false, domain: null };
    }
  }

  /**
   * Create a tag element
   */
  createTag(text, className) {
    const tag = document.createElement('span');
    tag.className = `js-tag ${className}`;
    tag.textContent = text;
    return tag;
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    this.elements.jsList.innerHTML = '';
    this.elements.emptyState.style.display = 'flex';
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    this.elements.emptyState.style.display = 'none';
  }

  /**
   * Update button states
   */
  updateButtons(enabled) {
    this.elements.copyBtn.disabled = !enabled;
    this.elements.downloadBtn.disabled = !enabled;
  }

  /**
   * Handle copy all functionality
   */
  async handleCopyAll() {
    const urls = Array.from(this.elements.jsList.children).map(item => 
      item.getAttribute('data-url')
    );
    
    if (urls.length === 0) {
      this.showToast('No URLs to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(urls.join('\\n'));
      this.showToast(`Copied ${urls.length} URLs to clipboard!`, 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showToast('Failed to copy URLs', 'error');
    }
  }

  /**
   * Handle download functionality
   */
  async handleDownload() {
    const urls = Array.from(this.elements.jsList.children).map(item => 
      item.getAttribute('data-url')
    );
    
    if (urls.length === 0) {
      this.showToast('No URLs to download', 'info');
      return;
    }

    try {
      const content = [
        `# JavaScript Files for ${this.currentDomain}`,
        `# Generated by BugSniffer on ${new Date().toLocaleString()}`,
        `# Total files: ${urls.length}`,
        '',
        ...urls
      ].join('\\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentDomain}_js_files.txt`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showToast(`Downloaded ${urls.length} URLs!`, 'success');
    } catch (error) {
      console.error('Failed to download:', error);
      this.showToast('Failed to download file', 'error');
    }
  }

  /**
   * Handle refresh functionality
   */
  async handleRefresh() {
    this.elements.refreshBtn.textContent = '🔄 Refreshing...';
    this.elements.refreshBtn.disabled = true;
    
    try {
      await this.loadAndRenderFiles();
      this.showToast('Refreshed successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh:', error);
      this.showToast('Failed to refresh', 'error');
    } finally {
      this.elements.refreshBtn.textContent = '🔄 Refresh';
      this.elements.refreshBtn.disabled = false;
    }
  }

  /**
   * Copy individual URL to clipboard
   */
  async copyToClipboard(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('URL copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      this.showToast('Failed to copy URL', 'error');
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    this.elements.toast.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.classList.add('show');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }

  /**
   * Start periodic refresh
   */
  startRefreshInterval() {
    this.refreshInterval = setInterval(async () => {
      if (this.currentDomain && this.enabled) {
        const currentCount = this.elements.jsList.children.length;
        
        try {
          const data = await new Promise(resolve => {
            chrome.storage.local.get([this.currentDomain], resolve);
          });
          
          const domainData = data[this.currentDomain];
          let newCount = 0;
          
          if (Array.isArray(domainData)) {
            newCount = domainData.length;
          } else if (domainData && domainData.files) {
            newCount = domainData.files.length;
          }

          if (newCount !== currentCount) {
            await this.loadAndRenderFiles();
          }
        } catch (error) {
          console.error('Failed to check for updates:', error);
        }
      }
    }, 2000);
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
}

// Initialize the popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new BugSnifferPopup();
  });
} else {
  new BugSnifferPopup();
}
