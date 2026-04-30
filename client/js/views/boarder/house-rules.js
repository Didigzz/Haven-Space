/**
 * House Rules Page
 *
 * Handles house rules display and download functionality
 */

import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.js';

/**
 * Initialize House Rules Page
 */
export async function initHouseRulesPage() {
  // Check access control first
  const accessResult = await initBoarderAccessControl();

  if (!accessResult.hasAccess) {
    const houseRulesContainer =
      document.querySelector('.house-rules-container') || document.querySelector('main');
    if (houseRulesContainer) {
      showProtectedEmptyState(houseRulesContainer, 'houseRules');
    }
    return;
  }

  // Download handbook handler
  const downloadBtn = document.getElementById('download-handbook-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', e => {
      e.preventDefault();
      // TODO: Integrate with backend API to download PDF
      alert('Download functionality will be connected to backend API.');
    });
  }
}
