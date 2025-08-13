/**
 * BugSniffer - Background Service Worker
 * Handles network monitoring, storage management, and cross-tab communication
 */

class BugSnifferBackground {
  constructor() {
    this.setupEventListeners();
    this.initialize();
  }

  /**
   * Initialize background service
   */
  initialize() {
    console.log('BugSniffer Background Service initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Network request monitoring
    chrome.webRequest.onCompleted.addListener(
      (details) => this.handleWebRequest(details),
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );

    // Message handling from content scripts and popup
    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => this.handleMessage(message, sender, sendResponse)
    );

    // Handle extension installation/startup
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    chrome.runtime.onInstalled.addListener((details) => this.handleInstalled(details));
  }

  /**
   * Handle web requests to detect JavaScript files
   */
  async handleWebRequest(details) {
    if (!this.isJavaScriptRequest(details.url)) {
      return;
    }

    // Check if extension is enabled
    const isEnabled = await this.getExtensionEnabledState();
    if (!isEnabled) {
      return;
    }

    const domain = this.extractDomain(details.initiator || details.documentUrl || details.url);
    if (!domain) {
      return;
    }

    const fileInfo = this.createFileInfo(details);
    await this.saveJavaScriptFile(domain, fileInfo);
  }

  /**
   * Handle messages from content scripts and popup
   */
  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SAVE_JS_URLS':
        this.handleSaveJsUrls(message, sender)
          .then(() => sendResponse({ success: true }))
          .catch(error => {
            console.error('Failed to save JS URLs:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep message channel open for async response

      case 'GET_DOMAIN_DATA':
        this.handleGetDomainData(message.domain)
          .then(data => sendResponse({ success: true, data }))
          .catch(error => {
            console.error('Failed to get domain data:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;

      case 'CLEAR_DOMAIN_DATA':
        this.handleClearDomainData(message.domain)
          .then(() => sendResponse({ success: true }))
          .catch(error => {
            console.error('Failed to clear domain data:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;

      default:
        console.warn('Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * Handle extension startup
   */
  handleStartup() {
    console.log('BugSniffer started up');
  }

  /**
   * Handle extension installation
   */
  handleInstalled(details) {
    if (details.reason === 'install') {
      console.log('BugSniffer installed');
      this.setDefaultSettings();
    } else if (details.reason === 'update') {
      console.log('BugSniffer updated to version', chrome.runtime.getManifest().version);
      this.handleUpdate(details.previousVersion);
    }
  }

  /**
   * Set default extension settings
   */
  async setDefaultSettings() {
    try {
      await this.setStorageData({
        bugsniffer_enabled: true,
        bugsniffer_settings: {
          autoRefresh: true,
          maxFilesPerDomain: 1000,
          retentionDays: 30
        }
      });
    } catch (error) {
      console.error('Failed to set default settings:', error);
    }
  }

  /**
   * Handle extension update
   */
  async handleUpdate(previousVersion) {
    try {
      // Migrate old data format if needed
      await this.migrateDataFormat(previousVersion);
    } catch (error) {
      console.error('Failed to handle update:', error);
    }
  }

  /**
   * Migrate data from old format to new format
   */
  async migrateDataFormat(previousVersion) {
    const allData = await this.getStorageData(null);
    const migrations = [];

    for (const [key, value] of Object.entries(allData)) {
      // Skip non-domain keys
      if (key.startsWith('bugsniffer_') || !Array.isArray(value)) {
        continue;
      }

      // Convert old array format to new object format
      if (Array.isArray(value)) {
        const newFormat = {
          files: value.map(url => ({
            url: typeof url === 'string' ? url : url.url,
            timestamp: Date.now(),
            source: 'legacy_migration'
          })),
          metadata: {
            version: chrome.runtime.getManifest().version,
            migrated: true,
            migrationDate: new Date().toISOString()
          }
        };

        migrations.push({ [key]: newFormat });
      }
    }

    if (migrations.length > 0) {
      console.log(`Migrating ${migrations.length} domains to new format`);
      for (const migration of migrations) {
        await this.setStorageData(migration);
      }
    }
  }

  /**
   * Check if URL is a JavaScript request
   */
  isJavaScriptRequest(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return /\.(m?js)([?#].*)?$/i.test(pathname) || 
             pathname.includes('.js') ||
             urlObj.searchParams.has('jsModule');
    } catch {
      return /\.(m?js)([?#].*)?$/i.test(url);
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    if (!url) return null;
    
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Create file information object from request details
   */
  createFileInfo(details) {
    return {
      url: details.url,
      timestamp: Date.now(),
      status: details.statusCode,
      ip: details.ip,
      fromCache: details.fromCache,
      type: details.type,
      method: details.method,
      requestTime: details.timeStamp,
      responseHeaders: this.extractRelevantHeaders(details.responseHeaders || []),
      tabId: details.tabId,
      source: 'network'
    };
  }

  /**
   * Extract relevant headers for security analysis
   */
  extractRelevantHeaders(headers) {
    const relevantHeaders = ['content-type', 'content-security-policy', 'x-content-type-options', 'cache-control'];
    
    return headers.filter(header => 
      relevantHeaders.includes(header.name.toLowerCase())
    ).reduce((acc, header) => {
      acc[header.name.toLowerCase()] = header.value;
      return acc;
    }, {});
  }

  /**
   * Save JavaScript file information to storage
   */
  async saveJavaScriptFile(domain, fileInfo) {
    try {
      const existingData = await this.getStorageData([domain]);
      let domainData = existingData[domain] || { files: [], metadata: {} };

      // Ensure new format
      if (Array.isArray(domainData)) {
        domainData = { files: domainData.map(url => ({ url, source: 'legacy' })), metadata: {} };
      }

      // Remove existing entry for this URL
      domainData.files = domainData.files.filter(file => 
        (file.url || file) !== fileInfo.url
      );

      // Add new entry
      domainData.files.push(fileInfo);

      // Update metadata
      domainData.metadata = {
        ...domainData.metadata,
        lastUpdated: Date.now(),
        totalFiles: domainData.files.length
      };

      // Limit number of files per domain
      const maxFiles = 1000;
      if (domainData.files.length > maxFiles) {
        domainData.files = domainData.files
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, maxFiles);
      }

      await this.setStorageData({ [domain]: domainData });
    } catch (error) {
      console.error('Failed to save JavaScript file:', error);
    }
  }

  /**
   * Handle saving JS URLs from content script
   */
  async handleSaveJsUrls(message) {
    const { domain, urls, inlines, csp, sri } = message;
    
    if (!domain) {
      throw new Error('Domain is required');
    }

    const existingData = await this.getStorageData([domain]);
    let domainData = existingData[domain] || { files: [], inlines: [], metadata: {} };

    // Ensure new format
    if (Array.isArray(domainData)) {
      domainData = { files: domainData.map(url => ({ url, source: 'legacy' })), inlines: [], metadata: {} };
    }

    // Add external URLs
    if (urls && urls.length > 0) {
      urls.forEach(url => {
        if (!domainData.files.some(file => (file.url || file) === url)) {
          domainData.files.push({
            url,
            timestamp: Date.now(),
            source: 'content_script'
          });
        }
      });
    }

    // Add inline scripts
    if (inlines && inlines.length > 0) {
      domainData.inlines = domainData.inlines || [];
      inlines.forEach(inline => {
        if (!domainData.inlines.some(existing => existing.hash === inline.hash)) {
          domainData.inlines.push({
            ...inline,
            timestamp: Date.now()
          });
        }
      });
    }

    // Store security information
    if (csp) domainData.csp = csp;
    if (sri && sri.length > 0) domainData.sri = sri;

    // Update metadata
    domainData.metadata = {
      ...domainData.metadata,
      lastUpdated: Date.now(),
      totalFiles: domainData.files.length,
      totalInlines: (domainData.inlines || []).length
    };

    await this.setStorageData({ [domain]: domainData });
  }

  /**
   * Handle getting domain data
   */
  async handleGetDomainData(domain) {
    if (!domain) {
      throw new Error('Domain is required');
    }

    const data = await this.getStorageData([domain]);
    return data[domain] || { files: [], inlines: [], metadata: {} };
  }

  /**
   * Handle clearing domain data
   */
  async handleClearDomainData(domain) {
    if (!domain) {
      throw new Error('Domain is required');
    }

    await this.removeStorageData([domain]);
  }

  /**
   * Get extension enabled state
   */
  async getExtensionEnabledState() {
    try {
      const data = await this.getStorageData(['bugsniffer_enabled']);
      return data.bugsniffer_enabled !== false; // Default to enabled
    } catch {
      return true;
    }
  }

  /**
   * Storage utility methods
   */
  async getStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  async setStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  async removeStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }
}

// Initialize the background service
const bugSnifferBackground = new BugSnifferBackground();
