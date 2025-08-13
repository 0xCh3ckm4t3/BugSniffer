// ===== STATS MANAGER =====
import { getAllDomainStats } from './utils.js';

class StatsManager {
  constructor() {
    this.fileCountElement = document.getElementById('file-count');
    this.domainCountElement = document.getElementById('domain-count');
  }

  /**
   * Update file count display
   */
  updateFileCount(count) {
    if (this.fileCountElement) {
      this.fileCountElement.textContent = count;
    }
  }

  /**
   * Update domain count display
   */
  updateDomainCount(count) {
    if (this.domainCountElement) {
      this.domainCountElement.textContent = count;
    }
  }

  /**
   * Update all stats
   */
  updateStats(fileCount) {
    this.updateFileCount(fileCount);
    
    getAllDomainStats(stats => {
      this.updateDomainCount(stats.domainCount);
    });
  }

  /**
   * Reset stats display
   */
  resetStats() {
    this.updateFileCount(0);
    this.updateDomainCount(0);
  }
}

export default StatsManager;
