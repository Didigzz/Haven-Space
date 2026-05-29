/**
 * Landlord Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and landlord dashboard for landlord views
 */

import CONFIG from '../../config.ts';
import { initSidebar } from '../../components/sidebar.ts';
import { initNavbar, updateNavbarNotifications } from '../../components/navbar.ts';
import { initLandlordDashboard } from './landlord.ts';
import { initMessages } from './messages.ts';
import { initLandlordSettings } from './settings.ts';
import { initAnnouncements } from './announcements.ts';
import { initLandlordPermissions } from '../../shared/permissions.ts';
import '../../shared/auth-headers.ts';
import { initDashboard } from '../../shared/dashboard-init.ts';
import { initOAuthHandler } from '../../shared/oauth-handler.ts';
import { getLoginPath } from '../../shared/routing.ts';

function loginPath() {
  return getLoginPath();
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'L').toUpperCase();
}

function getStoredLandlordUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return storedUser?.role === 'landlord' ? storedUser : null;
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    return null;
  }
}

function persistAuthenticatedUser(user) {
  if (!user) {
    return;
  }

  localStorage.setItem('user', JSON.stringify(user));

  if (user.id || user.user_id) {
    localStorage.setItem('user_id', String(user.user_id || user.id));
  }
}

/**
 * Initialize Landlord Dashboard
 * Sets up sidebar, navbar, and initializes landlord dashboard
 */
export async function initLandlordDashboardEntry() {
  // Handle OAuth redirect FIRST before any auth checks
  await initOAuthHandler();

  const storedLandlordUser = getStoredLandlordUser();
  const hasStoredToken = !!localStorage.getItem('token');

  // Check if this is a fresh registration (landlordStatus = 'new')
  const landlordStatus = localStorage.getItem('landlordStatus');
  const isNewRegistration = landlordStatus === 'new';

  // For new registrations, verify we have the essentials before proceeding
  if (isNewRegistration) {
    if (!hasStoredToken || !storedLandlordUser) {
      window.location.href = loginPath();
      return;
    }
    // Add delay for new registrations to ensure backend is ready
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  let user;
  let retryCount = 0;
  const maxRetries = isNewRegistration ? 3 : 1;

  while (retryCount < maxRetries) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = loginPath();
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        user = data.user;
        persistAuthenticatedUser(user);
        break; // Success, exit retry loop
      } else {
        await res.text(); // Consume the response body

        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } else if (storedLandlordUser && hasStoredToken && isNewRegistration) {
          // For new registrations, trust the stored data if auth keeps failing
          console.warn('Using stored landlord data for new registration');
          user = storedLandlordUser;
          break;
        } else {
          console.error('All auth attempts failed, redirecting to login');
          window.location.href = loginPath();
          return;
        }
      }
    } catch (error) {
      if (retryCount < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
      } else if (storedLandlordUser && hasStoredToken && isNewRegistration) {
        // For new registrations, trust the stored data if auth keeps failing
        user = storedLandlordUser;
        break;
      } else {
        window.location.href = loginPath();
        return;
      }
    }
  }

  if (!user || user.role !== 'landlord') {
    window.location.href = loginPath();
    return;
  }

  // Initialize profile data first
  await initDashboard();

  // Get updated user data
  const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const name =
    [updatedUser.first_name, updatedUser.last_name].filter(Boolean).join(' ').trim() || 'Landlord';
  const initials = initialsFrom(updatedUser);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'landlord',
      user: {
        name,
        initials,
        role: 'Landlord',
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
    });

    // Fetch real notifications from API after navbar is initialized
    setTimeout(() => updateNavbarNotifications(), 100);
  }

  // Initialize landlord dashboard
  initLandlordDashboard({
    user: {
      name,
      initials,
      role: 'Landlord',
    },
  });

  // Check landlord verification status and apply read-only restrictions if pending
  initLandlordPermissions();

  // Initialize specific pages based on current view
  const currentPath = window.location.pathname;

  if (currentPath.includes('messages')) {
    initMessages();
  }

  // Initialize announcements page
  if (currentPath.includes('announcements')) {
    initAnnouncements();
  }

  // Remove any CSS animations that might have been left behind
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach(style => {
    if (style.textContent.includes('@keyframes slideOut')) {
      style.remove();
    }
  });

  // Initialize settings page
  if (currentPath.includes('settings')) {
    initLandlordSettings();
  }

  // Initialize boarders page
  if (currentPath.includes('boarders')) {
    const { initLandlordBoarders } = await import('./landlord-boarders.ts');
    initLandlordBoarders();
  }

  // Setup navbar event listeners
  setupNavbarListeners();

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
      // Navigate to profile tab in settings
      window.location.href = '../settings/index.html#profile';
    });
  }
}
