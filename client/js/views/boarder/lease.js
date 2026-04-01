/**
 * Boarder Lease Page
 * Handles lease details, documents, payment history, and maintenance history
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

// TODO: Integrate with backend API for lease data
const API_BASE_URL = 'http://localhost:8000'; // TODO: Replace with actual API base URL

/**
 * Initialize Lease Page
 * Sets up sidebar, navbar, and lease page functionality
 */
export function initLeasePage() {
  const user = {
    name: 'Juan Dela Cruz',
    initials: 'JD',
    role: 'Boarder',
    email: 'juan@example.com',
  };

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user,
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name: user.name,
        initials: user.initials,
        avatarUrl: '',
        email: user.email,
      },
      notificationCount: 3,
    });
  }

  // Initialize lease page functionality
  setupLeasePage();

  console.log('Lease page initialized');
}

/**
 * Setup lease page functionality
 */
function setupLeasePage() {
  // TODO: Fetch lease data from backend
  // fetchLeaseData();

  // TODO: Fetch lease documents from backend
  // fetchLeaseDocuments();

  // TODO: Fetch payment history from backend
  // fetchPaymentHistory();

  // TODO: Fetch maintenance history from backend
  // fetchMaintenanceHistory();

  setupDocumentDownloadHandlers();
  loadMockData();
}

/**
 * Load mock data for development/testing
 * TODO: Remove this function when backend integration is complete
 */
function loadMockData() {
  console.log('Lease page loaded with mock data');
  console.log('TODO: Replace with actual API calls');
}

/**
 * Setup document download button handlers
 */
function setupDocumentDownloadHandlers() {
  const downloadButtons = document.querySelectorAll('.boarder-lease-doc-btn');

  downloadButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const docId = button.dataset.docId;

      // TODO: Integrate with backend API for document download
      // await downloadDocument(docId);

      // Mock download for development
      console.log(`TODO: Download document with ID: ${docId}`);
      alert(
        `TODO: Backend Integration\n\nDownloading document: ${docId}\n\nThis will connect to the backend API to fetch the actual document.`
      );
    });
  });
}

/**
 * Fetch lease data from backend
 * TODO: Integrate with backend API
 */
async function fetchLeaseData() {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${API_BASE_URL}/api/lease/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch lease data');
    }

    const data = await response.json();
    renderLeaseDetails(data);
  } catch (error) {
    console.error('Error fetching lease data:', error);
    // TODO: Show error message to user
  }
}

/**
 * Render lease details
 * @param {Object} lease - Lease data from backend
 */
function renderLeaseDetails(lease) {
  // TODO: Update lease details DOM elements with actual data
  console.log('TODO: Render lease details', lease);
}

/**
 * Fetch lease documents from backend
 * TODO: Integrate with backend API
 */
async function fetchLeaseDocuments() {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${API_BASE_URL}/api/lease/documents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch lease documents');
    }

    const data = await response.json();
    renderLeaseDocuments(data);
  } catch (error) {
    console.error('Error fetching lease documents:', error);
  }
}

/**
 * Render lease documents list
 * @param {Array} documents - Array of document objects
 */
function renderLeaseDocuments(documents) {
  // TODO: Update documents list DOM with actual data
  console.log('TODO: Render lease documents', documents);
}

/**
 * Download a lease document
 * @param {string} docId - Document ID
 * TODO: Integrate with backend API
 */
async function downloadDocument(docId) {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${API_BASE_URL}/api/lease/documents/${docId}/download`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    // TODO: Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading document:', error);
    // TODO: Show error message to user
  }
}

/**
 * Fetch payment history from backend
 * TODO: Integrate with backend API
 */
async function fetchPaymentHistory() {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${API_BASE_URL}/api/lease/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    const data = await response.json();
    renderPaymentHistory(data);
  } catch (error) {
    console.error('Error fetching payment history:', error);
  }
}

/**
 * Render payment history table
 * @param {Array} payments - Array of payment objects
 */
function renderPaymentHistory(payments) {
  // TODO: Update payment table DOM with actual data
  console.log('TODO: Render payment history', payments);
}

/**
 * Fetch maintenance history from backend
 * TODO: Integrate with backend API
 */
async function fetchMaintenanceHistory() {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${API_BASE_URL}/api/lease/maintenance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication header
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch maintenance history');
    }

    const data = await response.json();
    renderMaintenanceHistory(data);
  } catch (error) {
    console.error('Error fetching maintenance history:', error);
  }
}

/**
 * Render maintenance history list
 * @param {Array} maintenance - Array of maintenance request objects
 */
function renderMaintenanceHistory(maintenance) {
  // TODO: Update maintenance list DOM with actual data
  console.log('TODO: Render maintenance history', maintenance);
}

/**
 * Get authentication token from localStorage or cookie
 * @returns {string|null} Auth token
 * TODO: Implement proper auth token retrieval
 */
function getAuthToken() {
  // TODO: Replace with actual auth token retrieval
  return localStorage.getItem('authToken') || null;
}
