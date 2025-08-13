// content.js
// Extracts JS file URLs and sends to background
(function() {
  const domain = window.location.hostname;
  const urls = new Set();

  function toAbsolute(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return null;
    }
  }

  function isJsLike(u) {
    if (!u) return false;
    try {
      const parsed = new URL(u);
      // Strip query/hash when checking extension
      const pathname = parsed.pathname || '';
      return /\.(m?js)$/i.test(pathname);
    } catch {
      // If not absolute, try as relative
      try {
        const abs = new URL(u, window.location.href);
        return /\.(m?js)$/i.test(abs.pathname || '');
      } catch {
        return false;
      }
    }
  }

  function addUrl(u) {
    const abs = toAbsolute(u);
    if (abs && isJsLike(abs)) {
      urls.add(abs);
    }
  }

  function collectOnce() {
    // <script src>
    document.querySelectorAll('script[src]').forEach(s => addUrl(s.getAttribute('src')));
    // <link rel="modulepreload|preload" as="script" href="...">
    document.querySelectorAll('link[rel~="modulepreload"], link[rel~="preload"][as="script"]').forEach(l => addUrl(l.getAttribute('href')));
    // <a href="...js">
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && isJsLike(href)) addUrl(href);
    });
  }

  let saveTimer;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (urls.size) {
        chrome.runtime.sendMessage({ type: 'SAVE_JS_URLS', domain, urls: Array.from(urls) });
      }
    }, 250);
  }

  // Initial collection
  collectOnce();
  scheduleSave();

  // Observe dynamic additions to DOM
  const observer = new MutationObserver(mutations => {
    let changed = false;
    for (const m of mutations) {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.tagName === 'SCRIPT' && node.hasAttribute('src')) {
          addUrl(node.getAttribute('src'));
          changed = true;
        }
        if (node.tagName === 'LINK') {
          const rel = (node.getAttribute('rel') || '').toLowerCase();
          const as = (node.getAttribute('as') || '').toLowerCase();
          if ((rel.includes('modulepreload') || (rel.includes('preload') && as === 'script')) && node.hasAttribute('href')) {
            addUrl(node.getAttribute('href'));
            changed = true;
          }
        }
        if (node.tagName === 'A' && node.hasAttribute('href')) {
          const href = node.getAttribute('href');
          if (href && isJsLike(href)) {
            addUrl(href);
            changed = true;
          }
        }
        // Also check descendants
        node.querySelectorAll && node.querySelectorAll('script[src], link[rel~="modulepreload"], link[rel~="preload"][as="script"], a[href]').forEach(el => {
          if (el.tagName === 'SCRIPT') addUrl(el.getAttribute('src'));
          else if (el.tagName === 'LINK') {
            const rel2 = (el.getAttribute('rel') || '').toLowerCase();
            const as2 = (el.getAttribute('as') || '').toLowerCase();
            if ((rel2.includes('modulepreload') || (rel2.includes('preload') && as2 === 'script')) && el.hasAttribute('href')) addUrl(el.getAttribute('href'));
          } else if (el.tagName === 'A') {
            const href2 = el.getAttribute('href');
            if (href2 && isJsLike(href2)) addUrl(href2);
          }
        });
      });
    }
    if (changed) scheduleSave();
  });

  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
