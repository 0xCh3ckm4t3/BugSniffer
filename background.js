// background.js
// Handles per-domain storage, network monitoring, and communication

// Utility: get domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Store JS file info per domain: { [domain]: { files: [ {url, meta...} ], history: [ ... ] } }
function saveJsFile(domain, fileObj) {
  chrome.storage.local.get([domain], (data) => {
    let entry = data[domain] || { files: [], history: [] };
    // Remove any previous entry for this URL
    entry.files = entry.files.filter(f => f.url !== fileObj.url);
    entry.files.push(fileObj);
    // Track history (keep last 20 changes)
    entry.history = entry.history || [];
    entry.history.push({ ...fileObj, ts: Date.now() });
    if (entry.history.length > 20) entry.history = entry.history.slice(-20);
    chrome.storage.local.set({ [domain]: entry });
  });
}

// Listen for JS file network requests
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (!details.url.match(/\.(m?js)([?#].*)?$/i)) return;
    const domain = getDomain(details.initiator || details.documentUrl || details.url);
    if (!domain) return;
    const fileObj = {
      url: details.url,
      status: details.statusCode,
      ip: details.ip,
      fromCache: details.fromCache,
      type: details.type,
      method: details.method,
      timeStamp: details.timeStamp,
      responseHeaders: details.responseHeaders || [],
      tabId: details.tabId
    };
    saveJsFile(domain, fileObj);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Listen for inline scripts, CSP, SRI info from content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_JS_URLS') {
    const { domain, urls, inlines, csp, sri } = msg;
    chrome.storage.local.get([domain], (data) => {
      let entry = data[domain] || { files: [], history: [], inlines: [], csp: null, sri: [] };
      // Add/merge external URLs
      if (urls && urls.length) {
        urls.forEach(u => {
          if (!entry.files.some(f => f.url === u)) {
            entry.files.push({ url: u });
          }
        });
      }
      // Add/merge inline scripts
      if (inlines && inlines.length) {
        entry.inlines = entry.inlines || [];
        inlines.forEach(i => {
          if (!entry.inlines.some(e => e.hash === i.hash)) {
            entry.inlines.push(i);
          }
        });
      }
      // Store CSP and SRI info
      if (csp) entry.csp = csp;
      if (sri && sri.length) entry.sri = sri;
      chrome.storage.local.set({ [domain]: entry });
    });
  }
  sendResponse && sendResponse();
  return true;
});
