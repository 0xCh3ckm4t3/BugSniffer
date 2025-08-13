/**
 * BugSniffer - Content Script
 * Extracts JavaScript file URLs and security information from web pages
 */

class BugSnifferContentScript {
  constructor() {
    this.domain = window.location.hostname;
    this.urls = new Set();
    this.inlines = [];
    this.saveTimer = null;
    this.observer = null;
    
    this.suspiciousPatterns = [
      /eval\s*\(/i,
      /document\.write/i,
      /atob\s*\(/i,
      /btoa\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /fromCharCode/i,
      /base64/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i
    ];

    this.checkEnabledAndRun();
  }

  /**
   * Check if extension is enabled before running
   */
  async checkEnabledAndRun() {
    try {
      const enabled = await this.getExtensionEnabledState();
      if (enabled) {
        this.initialize();
      }
    } catch (error) {
      console.error('BugSniffer content script error:', error);
    }
  }

  /**
   * Get extension enabled state from storage
   */
  async getExtensionEnabledState() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['bugsniffer_enabled'], (data) => {
          resolve(data.bugsniffer_enabled !== false); // Default to enabled
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Initialize the content script
   */
  initialize() {
    if (!this.domain) return;

    this.collectInitialFiles();
    this.scheduleSave();
    this.setupMutationObserver();
    
    // Also try to collect after page load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectInitialFiles();
          this.scheduleSave();
        }, 1000);
      });
    }
  }

  /**
   * Convert relative URL to absolute URL
   */
  toAbsoluteUrl(url) {
    if (!url) return null;
    
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is JavaScript-like
   */
  isJavaScriptLike(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname.toLowerCase();
      
      return /\.(m?js)$/i.test(pathname) ||
             pathname.includes('.js') ||
             urlObj.searchParams.has('jsModule') ||
             urlObj.searchParams.has('module');
    } catch {
      return /\.(m?js)$/i.test(url);
    }
  }

  /**
   * Add URL to collection
   */
  addUrl(url) {
    const absoluteUrl = this.toAbsoluteUrl(url);
    if (absoluteUrl && this.isJavaScriptLike(absoluteUrl)) {
      this.urls.add(absoluteUrl);
    }
  }

  /**
   * Generate simple hash for inline script content
   */
  generateHash(str) {
    if (!str) return 0;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Check for suspicious patterns in code
   */
  checkSuspiciousPatterns(code) {
    return this.suspiciousPatterns
      .filter(pattern => pattern.test(code))
      .map(pattern => pattern.source);
  }

  /**
   * Collect initial JavaScript files from the page
   */
  collectInitialFiles() {
    // External script sources
    this.collectExternalScripts();
    
    // Module preloads and script preloads
    this.collectPreloadedScripts();
    
    // JavaScript links
    this.collectJavaScriptLinks();
    
    // Inline scripts
    this.collectInlineScripts();
  }

  /**
   * Collect external script sources
   */
  collectExternalScripts() {
    document.querySelectorAll('script[src]').forEach(script => {
      this.addUrl(script.getAttribute('src'));
    });
  }

  /**
   * Collect preloaded scripts
   */
  collectPreloadedScripts() {
    const selectors = [
      'link[rel~="modulepreload"]',
      'link[rel~="preload"][as="script"]'
    ];
    
    document.querySelectorAll(selectors.join(', ')).forEach(link => {
      this.addUrl(link.getAttribute('href'));
    });
  }

  /**
   * Collect JavaScript links
   */
  collectJavaScriptLinks() {
    document.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (href && this.isJavaScriptLike(href)) {
        this.addUrl(href);
      }
    });
  }

  /**
   * Collect inline scripts
   */
  collectInlineScripts() {
    document.querySelectorAll('script:not([src])').forEach(script => {
      const code = script.textContent?.trim();
      if (!code || code.length === 0) return;

      const snippet = code.slice(0, 100).replace(/\\s+/g, ' ');
      const hash = this.generateHash(code);
      const suspicious = this.checkSuspiciousPatterns(code);
      
      // Check if we already have this inline script
      const existingInline = this.inlines.find(inline => inline.hash === hash);
      if (!existingInline) {
        this.inlines.push({
          hash,
          snippet,
          suspicious,
          length: code.length,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Get Content Security Policy
   */
  getCSP() {
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return metaCSP ? metaCSP.getAttribute('content') : null;
  }

  /**
   * Get Subresource Integrity information
   */
  getSRI() {
    const sri = [];
    const selectors = [
      'script[src][integrity]',
      'link[rel~="preload"][as="script"][integrity]',
      'link[rel~="modulepreload"][integrity]'
    ];
    
    document.querySelectorAll(selectors.join(', ')).forEach(element => {
      const url = element.src || element.href;
      const integrity = element.getAttribute('integrity');
      
      if (url && integrity) {
        sri.push({
          url: this.toAbsoluteUrl(url),
          integrity,
          algorithm: integrity.split('-')[0] // Extract hash algorithm
        });
      }
    });
    
    return sri;
  }

  /**
   * Schedule saving data to background script
   */
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveToBackground();
    }, 300); // Debounce multiple rapid changes
  }

  /**
   * Send collected data to background script
   */
  async saveToBackground() {
    if (!chrome.runtime?.sendMessage) return;

    try {
      const message = {
        type: 'SAVE_JS_URLS',
        domain: this.domain,
        urls: Array.from(this.urls),
        inlines: this.inlines,
        csp: this.getCSP(),
        sri: this.getSRI(),
        timestamp: Date.now()
      };

      await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to save to background:', error);
    }
  }

  /**
   * Send message to background script
   */
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle new elements added to the DOM
   */
  handleNewElement(element) {
    let changed = false;

    // Handle script elements
    if (element.tagName === 'SCRIPT') {
      if (element.hasAttribute('src')) {
        this.addUrl(element.getAttribute('src'));
        changed = true;
      } else if (element.textContent) {
        this.collectInlineScripts();
        changed = true;
      }
    }

    // Handle link elements
    if (element.tagName === 'LINK') {
      const rel = (element.getAttribute('rel') || '').toLowerCase();
      const asAttr = (element.getAttribute('as') || '').toLowerCase();
      
      if ((rel.includes('modulepreload') || 
          (rel.includes('preload') && asAttr === 'script')) && 
          element.hasAttribute('href')) {
        this.addUrl(element.getAttribute('href'));
        changed = true;
      }
    }

    // Handle anchor elements
    if (element.tagName === 'A' && element.hasAttribute('href')) {
      const href = element.getAttribute('href');
      if (href && this.isJavaScriptLike(href)) {
        this.addUrl(href);
        changed = true;
      }
    }

    // Check descendants
    if (element.querySelectorAll) {
      const relevantElements = element.querySelectorAll(
        'script[src], script:not([src]), link[rel~="modulepreload"], link[rel~="preload"][as="script"], a[href]'
      );
      
      relevantElements.forEach(el => {
        if (el.tagName === 'SCRIPT') {
          if (el.hasAttribute('src')) {
            this.addUrl(el.getAttribute('src'));
            changed = true;
          } else if (el.textContent?.trim()) {
            changed = true; // Will be handled by collectInlineScripts
          }
        } else if (el.tagName === 'LINK') {
          const rel = (el.getAttribute('rel') || '').toLowerCase();
          const asAttr = (el.getAttribute('as') || '').toLowerCase();
          
          if ((rel.includes('modulepreload') || 
              (rel.includes('preload') && asAttr === 'script')) && 
              el.hasAttribute('href')) {
            this.addUrl(el.getAttribute('href'));
            changed = true;
          }
        } else if (el.tagName === 'A' && el.hasAttribute('href')) {
          const href = el.getAttribute('href');
          if (href && this.isJavaScriptLike(href)) {
            this.addUrl(href);
            changed = true;
          }
        }
      });
      
      if (changed && element.querySelectorAll('script:not([src])').length > 0) {
        this.collectInlineScripts();
      }
    }

    return changed;
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let hasChanges = false;

      mutations.forEach(mutation => {
        if (!mutation.addedNodes) return;

        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          
          if (this.handleNewElement(node)) {
            hasChanges = true;
          }
        });
      });

      if (hasChanges) {
        this.scheduleSave();
      }
    });

    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: false // We don't need attribute changes for now
    });
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// Initialize content script
try {
  // Create instance only if not already created
  if (!window.bugSnifferContentScript) {
    window.bugSnifferContentScript = new BugSnifferContentScript();
  }
} catch (error) {
  console.error('Failed to initialize BugSniffer content script:', error);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.bugSnifferContentScript) {
    window.bugSnifferContentScript.destroy();
  }
});
