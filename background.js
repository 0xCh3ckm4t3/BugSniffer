// background.js
// Handles per-domain storage and communication

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_JS_URLS') {
    const { domain, urls } = msg;
    chrome.storage.local.get([domain], (data) => {
      const existing = data[domain] || [];
      const merged = Array.from(new Set([...existing, ...urls]));
      chrome.storage.local.set({ [domain]: merged });
    });
  }
  sendResponse();
  return true;
});
