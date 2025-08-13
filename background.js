// background.js - Professional JS Discovery Service Worker
// Implements the proper Manifest V3 passive discovery pipeline

// In-memory cache for discovered JS files per tab
const tabJSFiles = new Map(); // tabId -> Set<url>
const globalJSFiles = new Map(); // domain -> Set<url>
const urlHashes = new Map(); // url -> SHA-256 hash for deduplication

// Initialize extension on startup
chrome.runtime.onStartup.addListener(() => {
  initializeExtension();
});

chrome.runtime.onInstalled.addListener((details) => {
  initializeExtension();
});

function initializeExtension() {
  // Set extension as enabled by default
  chrome.storage.local.get(['bugsniffer_enabled'], (result) => {
    if (result.bugsniffer_enabled === undefined) {
      chrome.storage.local.set({ 'bugsniffer_enabled': true });
    }
  });
}

// Initialize immediately when service worker loads
initializeExtension();

// === CORE DISCOVERY PIPELINE ===

// 1. Network-level script discovery - catches ALL script requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only process script requests
    if (details.type === 'script') {
      storeJS(details.url, details.tabId, 'network');
    }
  },
  { urls: ['<all_urls>'] },
  [] // No extra info needed for onBeforeRequest
);

// 2. Navigation-based discovery - catches dynamic imports and SPA changes
chrome.webNavigation.onCommitted.addListener(
  ({ tabId, url, frameId }) => {
    // Only process main frame navigations
    if (frameId === 0) {
      // Clear previous tab cache for new navigation
      tabJSFiles.delete(tabId);
      
      // Inject script to find dynamic and inline scripts
      chrome.scripting.executeScript({
        target: { tabId },
        func: findInlineAndDynamicScripts
      }).catch(err => {
        console.warn('⚠️ Could not inject discovery script:', err.message);
      });
    }
  }
);

// Function injected into page context to find scripts
function findInlineAndDynamicScripts() {
  // Find all script elements with src attributes (including dynamically added)
  const scriptSrcs = [...document.querySelectorAll('script[src]')]
    .map(s => s.src)
    .filter(src => src && src.startsWith('http'));
  
  // Find module preload links (Vite, Webpack chunk hints)
  const modulePreloads = [...document.querySelectorAll('link[rel="modulepreload"], link[rel="preload"][as="script"]')]
    .map(l => l.href)
    .filter(href => href && href.startsWith('http'));
  
  // Find import maps
  const importMaps = [...document.querySelectorAll('script[type="importmap"]')]
    .map(script => {
      try {
        const map = JSON.parse(script.textContent);
        const imports = map.imports || {};
        return Object.values(imports).filter(url => url.startsWith('http'));
      } catch {
        return [];
      }
    })
    .flat();
  
  // Combine all discovered URLs
  const allUrls = [...new Set([...scriptSrcs, ...modulePreloads, ...importMaps])];
  
  // Send discovered URLs back to service worker
  if (allUrls.length > 0) {
    chrome.runtime.sendMessage({
      type: 'DISCOVERED_SCRIPTS',
      urls: allUrls,
      source: 'dom_injection'
    });
  }
}

// Store discovered JavaScript file
function storeJS(url, tabId, source = 'unknown') {
  // Validate URL
  if (!url || !url.startsWith('http')) {
    return;
  }
  
  // Skip common false positives
  if (url.includes('data:') || url.includes('javascript:') || url.includes('chrome-extension:')) {
    return;
  }
  
  const domain = getDomain(url);
  if (!domain) return;
  
  // Add to tab-specific cache
  if (!tabJSFiles.has(tabId)) {
    tabJSFiles.set(tabId, new Set());
  }
  tabJSFiles.get(tabId).add(url);
  
  // Add to global domain cache
  if (!globalJSFiles.has(domain)) {
    globalJSFiles.set(domain, new Set());
  }
  
  // Check if we've seen this URL before
  const wasNew = !globalJSFiles.get(domain).has(url);
  globalJSFiles.get(domain).add(url);
  
  if (wasNew) {
    // Create file object with metadata
    const fileObj = {
      url: url,
      domain: domain,
      discoveredAt: Date.now(),
      source: source,
      tabId: tabId,
      filename: getFilename(url)
    };
    
    // Store persistently
    saveJSFile(domain, fileObj);
  }
}

// === STORAGE MANAGEMENT ===

// Store JS file info per domain with deduplication
function saveJSFile(domain, fileObj) {
  chrome.storage.local.get([domain], (data) => {
    let entry = data[domain] || { files: [], lastCrawl: null };
    
    // Remove any previous entry for this URL (deduplication)
    entry.files = entry.files.filter(f => f.url !== fileObj.url);
    
    // Add new entry
    entry.files.push(fileObj);
    entry.lastCrawl = Date.now();
    
    // Keep only last 100 files per domain to prevent storage bloat
    if (entry.files.length > 100) {
      entry.files = entry.files.slice(-100);
    }
    
    // Save to storage
    chrome.storage.local.set({ [domain]: entry });
  });
}

// === UTILITY FUNCTIONS ===

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'unknown.js';
  } catch {
    return 'unknown.js';
  }
}

// Generate SHA-256 hash for URL (for advanced deduplication)
async function hashURL(url) {
  if (urlHashes.has(url)) {
    return urlHashes.get(url);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  urlHashes.set(url, hash);
  return hash;
}

// === MESSAGE HANDLING ===

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_JS_FILES') {
    // Popup requesting current JS files for a domain
    const domain = msg.domain;
    chrome.storage.local.get([domain], (data) => {
      const entry = data[domain] || { files: [] };
      sendResponse({ 
        success: true, 
        files: entry.files,
        count: entry.files.length,
        domain: domain
      });
    });
    return true;
  }
  
  if (msg.type === 'DISCOVERED_SCRIPTS') {
    // Content script reporting discovered scripts
    const { urls, source } = msg;
    const tabId = sender.tab?.id;
    
    if (urls && Array.isArray(urls) && tabId) {
      urls.forEach(url => storeJS(url, tabId, source));
      sendResponse({ success: true, processed: urls.length });
    }
    return true;
  }
  
  if (msg.type === 'CLEAR_DOMAIN') {
    // Clear all JS files for a domain
    const domain = msg.domain;
    chrome.storage.local.remove([domain], () => {
      globalJSFiles.delete(domain);
      sendResponse({ success: true });
    });
    return true;
  }
});

// === TAB MANAGEMENT ===

// Clean up tab cache when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabJSFiles.delete(tabId);
});

// === DEBUGGING ===

// Debug endpoint for popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DEBUG_STATS') {
    sendResponse({
      tabCaches: Array.from(tabJSFiles.entries()).map(([tabId, urls]) => ({
        tabId,
        urlCount: urls.size
      })),
      globalDomains: Array.from(globalJSFiles.entries()).map(([domain, urls]) => ({
        domain,
        urlCount: urls.size
      })),
      totalUrls: Array.from(globalJSFiles.values()).reduce((sum, set) => sum + set.size, 0)
    });
    return true;
  }
});
