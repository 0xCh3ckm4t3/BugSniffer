// ===== UTILITY FUNCTIONS =====

/**
 * Extract domain from URL
 */
export function getDomain(callback) {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    try {
      const url = new URL(tabs[0].url);
      callback(url.hostname);
    } catch {
      callback(null);
    }
  });
}

/**
 * Get statistics for all stored domains
 */
export function getAllDomainStats(callback) {
  chrome.storage.local.get(null, (data) => {
    const domains = Object.keys(data)
      .filter(key => key !== 'bugsniffer_enabled' && Array.isArray(data[key]));
    const totalFiles = domains.reduce((sum, domain) => sum + data[domain].length, 0);
    callback({ domainCount: domains.length, totalFiles });
  });
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Download content as file
 */
export function downloadAsFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Debounce function execution
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
