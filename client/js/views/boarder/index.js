/**
 * Boarder Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and loads dashboard data for boarder views
 */

import '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { loadDashboardData } from './dashboard.js';
import { initMessages } from './messages.js';
import { initBoarderFindARoom } from './boarder-find-a-room-auth.js';
import { initLeasePage } from './tenancy.js';
import { initPaymentPage } from './boarder-payment-process.js';
import { initSettingsPage } from './settings.js';
import { initAnnouncements } from './announcements.js';
import { initDashboardMap } from './dashboard-map.js';
import { initHouseRulesPage } from './house-rules.js';
import { initBoarderStatus } from './status.js';
import { openAcceptedApplicationsOverlay } from '../../components/accepted-applications-overlay.js';
import { hasAcceptedApplications } from '../../shared/notifications.js';
import { updateNavbarNotifications } from '../../components/navbar.js';
import { initDashboard } from '../../shared/dashboard-init.js';
import { ensureAuth } from '../../shared/auth-sync.js';
import { initOAuthHandler } from '../../shared/oauth-handler.js';

function loginPath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;

  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }

  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if we're already in a views subdirectory
    if (pathname.includes('/views/')) {
      // Extract the base path up to /views/
      const viewsIndex = pathname.indexOf('/views/');
      const basePath = pathname.substring(0, viewsIndex + 7); // Include '/views/'
      return `${basePath}public/auth/login.html`;
    }

    // Default for localhost - assume haven-space project structure
    if (pathname.includes('/haven-space/')) {
      return '/haven-space/client/views/public/auth/login.html';
    }

    // Fallback for localhost
    return '/client/views/public/auth/login.html';
  }

  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'B').toUpperCase();
}

/**
 * Initialize Boarder Dashboard
 * Sets up sidebar, navbar, and loads dashboard data
 */
export async function initBoarderDashboard() {
  // Handle OAuth redirect FIRST before any auth checks
  await initOAuthHandler();

  // Ensure user is authenticated as a boarder and data is synced
  const user = await ensureAuth('boarder');

  if (!user) {
    console.error('Authentication failed or user is not a boarder');
    window.location.href = loginPath();
    return;
  }

  // Check boarder status and redirect if not accepted
  const boarderStatus = user.boarder_status || user.boarderStatus || 'new';
  if (boarderStatus !== 'accepted') {
    // Non-accepted boarders should be in applications dashboard
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/'
      : '/views/';
    window.location.href = `${basePath}boarder/applications-dashboard/index.html`;
    return;
  }

  // Initialize profile data first
  await initDashboard();

  // Get updated user data
  const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const name =
    [updatedUser.first_name, updatedUser.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(updatedUser);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    // Get boarder status from user data (default to accepted for main dashboard)
    const boarderStatus = updatedUser.boarder_status || updatedUser.boarderStatus || 'accepted';

    initSidebar({
      role: 'boarder',
      boarderStatus: boarderStatus,
      user: {
        name,
        initials,
        role: 'Boarder',
        email: updatedUser.email || '',
        avatar_url: updatedUser.avatar_url || '',
      },
    });

    // Keep sidebar avatar/name in sync after profile updates
    window.addEventListener('userProfileUpdated', e => {
      const updated = e.detail || {};
      const avatarImg = document.getElementById('sidebar-avatar-img');
      const avatarInitials = document.getElementById('sidebar-avatar-initials');
      const sidebarName = document.getElementById('sidebar-profile-name');
      if (updated.avatar_url && avatarImg && avatarInitials) {
        avatarImg.src = updated.avatar_url;
        avatarImg.style.cssText =
          'display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;';
        avatarInitials.style.display = 'none';
        avatarImg.onerror = () => {
          avatarImg.style.display = 'none';
          avatarInitials.style.display = 'flex';
        };
      }
      if ((updated.first_name || updated.last_name) && sidebarName) {
        sidebarName.textContent =
          `${updated.first_name || ''} ${updated.last_name || ''}`.trim() ||
          sidebarName.textContent;
      }
    });
  }

  // Initialize navbar with updated user data
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: updatedUser,
      notificationCount: 0,
    });

    // Fetch real notifications from API
    updateNavbarNotifications();
  }

  // Check for accepted applications and show overlay
  try {
    const hasAccepted = await hasAcceptedApplications();
    if (hasAccepted) {
      openAcceptedApplicationsOverlay();
    }
  } catch {
    // Failed to check accepted applications
  }

  // Load dashboard data
  loadDashboardData();

  // Initialize boarder status banners (pending/rejected states)
  initBoarderStatus();

  // Initialize specific pages based on current view
  const currentPath = window.location.pathname;

  // Initialize onboarding checklist (only on main dashboard)
  // Temporarily disabled due to endpoint issues
  /*
  if (currentPath.includes('/boarder/index.html') || currentPath.endsWith('/boarder/')) {
    try {
      await onboardingChecklist.init();
    } catch (error) {
      console.error('Error initializing onboarding checklist:', error);
    }
  }
  */

  // Initialize dashboard map
  initDashboardMap();

  if (currentPath.includes('find-a-room')) {
    initBoarderFindARoom();
  }

  if (currentPath.includes('messages')) {
    initMessages();
  }

  if (currentPath.includes('tenancy')) {
    initLeasePage();
  }

  // Initialize payment page
  if (currentPath.includes('pay.html')) {
    initPaymentPage();
  }

  // Initialize settings page
  if (currentPath.includes('settings')) {
    initSettingsPage();
  }

  // Initialize announcements page
  if (currentPath.includes('announcements')) {
    initAnnouncements();
  }

  // Initialize house rules page
  if (currentPath.includes('house-rules')) {
    initHouseRulesPage();
  }

  // Setup navbar event listeners only if navbar exists
  if (navbarContainer) {
    setupNavbarListeners();
  }
}

/**
 * Setup navbar event listeners for profile and settings
 */
function setupNavbarListeners() {
  // Listen for settings click from navbar
  window.addEventListener('navbar:user:settings:click', () => {
    // Navigate to settings page
    window.location.href = '../settings/index.html';
  });

  // Listen for profile click from navbar
  window.addEventListener('navbar:user:profile:click', () => {
    // Check boarder status before navigating
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const boarderStatus = user.boarder_status || user.boarderStatus || 'new';

    // Only accepted boarders can access main settings
    if (boarderStatus === 'accepted') {
      window.location.href = '../settings/index.html#profile';
    } else {
      // Non-accepted boarders go to applications dashboard settings
      window.location.href = '../applications-dashboard/settings/index.html#profile';
    }
  });
}
