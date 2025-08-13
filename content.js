// content.js
// Minimal content script - Service worker handles most discovery

// Mark that content script has loaded
window.bugSnifferContentLoaded = true;

(function() {
  // Get current domain immediately
  const domain = window.location.hostname;
  
  // Check if extension is enabled (with fallback)
  function checkEnabledAndRun() {
    chrome.storage.local.get(['bugsniffer_enabled'], data => {
      // If explicitly disabled, exit
      if (data.bugsniffer_enabled === false) {
        return;
      }
      
      // Otherwise run (default to enabled)
      runSupplementaryDetection();
    });
  }
  
  // Supplementary detection for edge cases the service worker might miss
  function runSupplementaryDetection() {
    function toAbsolute(url) {
      try {
        return new URL(url, window.location.href).href;
      } catch {
        return null;
      }
    }

    function isJsLike(u) {
      if (!u) return false;
      
      // Basic JS file patterns
      if (u.match(/\.(m?js)([?#].*)?$/i)) return true;
      
      // Dynamic imports, webpack chunks, etc.
      if (u.includes('chunk') && u.includes('js')) return true;
      if (u.includes('bundle') && u.includes('js')) return true;
      
      return false;
    }

    const urls = new Set();

    // Find any scripts that might have been loaded dynamically after service worker
    document.querySelectorAll('script[src]').forEach(script => {
      const src = toAbsolute(script.src);
      if (src && isJsLike(src)) {
        urls.add(src);
      }
    });

    // Look for module preloads and script preloads
    document.querySelectorAll('link[rel="modulepreload"], link[rel="preload"][as="script"]').forEach(link => {
      const href = toAbsolute(link.href);
      if (href && isJsLike(href)) {
        urls.add(href);
      }
    });

    // Send any supplementary findings to service worker
    if (urls.size > 0) {
      // Send found scripts to background service worker
      chrome.runtime.sendMessage({
        type: 'DISCOVERED_SCRIPTS',
        urls: Array.from(urls),
        source: 'content_script'
      }).catch(err => {
        console.warn('Failed to send supplementary scripts to service worker:', err);
      });
    }
  }

  // Start detection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkEnabledAndRun);
  } else {
    // DOM already loaded
    checkEnabledAndRun();
  }

  // Also re-run on dynamic content changes (for SPAs)
  const observer = new MutationObserver((mutations) => {
    let hasNewScripts = false;
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'SCRIPT' && node.src) {
            hasNewScripts = true;
          }
          // Check descendants
          if (node.querySelectorAll && node.querySelectorAll('script[src]').length > 0) {
            hasNewScripts = true;
          }
        }
      });
    });
    
    if (hasNewScripts) {
      runSupplementaryDetection();
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
