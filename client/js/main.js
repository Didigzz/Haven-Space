import { initLogoCloud } from './components/logo-cloud.js';
import { initSidebar } from './components/sidebar.js';
import { initNavbar } from './components/navbar.js';
import { loadDashboardData } from './views/boarder/dashboard.js';
import { initLandlordDashboard } from './views/landlord/landlord.js';
import CONFIG from './config.js';

/**
 * Redirect to login page based on current path
 */
function redirectToLogin() {
  const path = window.location.pathname;
  let loginPath = '';
  
  if (path.includes('/views/public/auth/')) {
    loginPath = 'login.html';
  } else if (path.includes('/views/boarder/index.html') || path.includes('/views/landlord/index.html')) {
    loginPath = '../public/auth/login.html';
  } else if (path.includes('/views/boarder/') || path.includes('/views/landlord/')) {
    // For subfolders like boarder/applications/
    loginPath = '../../public/auth/login.html';
  } else {
    // Default fallback
    loginPath = 'views/public/auth/login.html';
  }
  
  window.location.href = loginPath;
}

// Initialize components
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = userStr ? JSON.parse(userStr) : null;

  // Only init logo cloud if element exists (homepage only)
  if (document.getElementById('logoSlider')) {
    initLogoCloud();
  }

  initFloatingHeader();

  // Detect if this is a dashboard page
  const isLandlordDashboard = document.querySelector('.landlord-dashboard');
  const isBoarderDashboard = document.querySelector('.boarder-dashboard');
  const isDashboard = isLandlordDashboard || isBoarderDashboard;

  // Auth Guard
  if (isDashboard) {
    if (!token) {
      console.warn('No token found. Redirecting to login...');
      redirectToLogin();
      return;
    }

    // Verify token with backend
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Token invalid or expired');
      }

      const result = await response.json();
      // Use the user data from the token payload (or the user object returned by me.php)
      user = result.user; 
      localStorage.setItem('user', JSON.stringify(user));

      // Role-based Access Control
      if (isLandlordDashboard && user.role !== 'landlord') {
        console.warn('User is not a landlord. Redirecting to boarder dashboard...');
        window.location.href = '../../boarder/index.html';
        return;
      }
      if (isBoarderDashboard && user.role !== 'boarder') {
        console.warn('User is not a boarder. Redirecting to landlord dashboard...');
        window.location.href = '../../landlord/index.html';
        return;
      }    } catch (error) {
      console.error('Auth verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      redirectToLogin();
      return;
    }
  }

  // Only init sidebar if container exists (dashboard pages only)
  if (document.getElementById('sidebar-container')) {
    const userData = user ? {
      name: user.first_name ? `${user.first_name} ${user.last_name}` : user.email,
      initials: user.first_name ? `${user.first_name[0]}${user.last_name[0]}` : user.email[0].toUpperCase(),
      role: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User',
    } : {
      name: 'Guest',
      initials: 'G',
      role: 'Guest',
    };

    if (isLandlordDashboard) {
      initSidebar({
        role: 'landlord',
        user: userData,
      });

      // Initialize landlord dashboard
      initLandlordDashboard({
        user: userData,
      });
    } else if (isBoarderDashboard) {
      initSidebar({
        role: 'boarder',
        user: userData,
      });

      // Initialize boarder dashboard
      loadDashboardData();
    } else {
      // Default to boarder for other dashboard pages
      initSidebar({
        role: 'boarder',
        user: userData,
      });
    }
  }

  // Only init navbar if container exists (dashboard pages only)
  if (document.getElementById('navbar-container')) {
    const userData = user ? {
      name: user.first_name ? `${user.first_name} ${user.last_name}` : user.email,
      initials: user.first_name ? `${user.first_name[0]}${user.last_name[0]}` : user.email[0].toUpperCase(),
      avatarUrl: '', // Will use default sample.png
    } : {
      name: 'Guest',
      initials: 'G',
      avatarUrl: '',
    };

    initNavbar({
      user: userData,
      notificationCount: 3,
    });
  }
});

/**
 * Floating Header - Scroll-triggered transition
 * Transitions header from full-width to floating pill on scroll
 */
function initFloatingHeader() {
  const navbar = document.querySelector('.navbar');
  const scrollThreshold = 50; // px to trigger floating state

  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > scrollThreshold) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  // Add scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Initial check in case page loads mid-scroll
  handleScroll();

  // Cleanup function (for SPA navigation or component unmounting)
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}
