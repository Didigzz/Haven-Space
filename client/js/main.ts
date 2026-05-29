/**
 * Main Entry Point - View Router
 *
 * Detects current view and initializes appropriate components
 * Uses data attributes on body to detect view type
 * Uses dynamic imports to isolate failures - a broken view won't break others
 */

// Initialize theme system early
import { initTheme } from './shared/theme-manager.ts';
import { initOAuthHandler } from './shared/oauth-handler.ts';
initTheme();

/**
 * Detect current view and initialize appropriate components
 * Uses data attribute on body to detect view type
 */
async function detectAndInitialize() {
  await initOAuthHandler();

  const body = document.body;
  const view = body.dataset.view || 'public';

  // Initialize appropriate dashboard based on view type
  switch (view) {
    case 'boarder-find-room-auth': {
      const { initBoarderFindARoomAuth } = await import(
        './views/boarder/boarder-find-a-room-init.ts'
      );
      initBoarderFindARoomAuth();
      break;
    }
    case 'boarder-room-detail-auth': {
      const { initBoarderRoomDetailAuth } = await import(
        './views/boarder/boarder-room-detail-init.ts'
      );
      initBoarderRoomDetailAuth();
      break;
    }
    case 'boarder-confirm-application': {
      const { initConfirmApplication } = await import('./views/boarder/confirm-application.ts');
      initConfirmApplication();
      break;
    }
    case 'application-submitted': {
      const { initApplicationSubmitted } = await import('./views/boarder/application-submitted.ts');
      initApplicationSubmitted();
      break;
    }
    case 'boarder': {
      const { initBoarderDashboard } = await import('./views/boarder/index.ts');
      initBoarderDashboard();
      break;
    }
    case 'boarder-applications': {
      const { initApplicationsDashboard } = await import(
        './views/boarder/applications-dashboard.ts'
      );
      initApplicationsDashboard();
      break;
    }
    case 'boarder-maps': {
      const { initBoarderMaps } = await import('./views/boarder/boarder-maps-init.ts');
      initBoarderMaps();
      break;
    }
    case 'landlord': {
      const { initLandlordDashboardEntry } = await import('./views/landlord/index.ts');
      initLandlordDashboardEntry();
      break;
    }
    case 'landlord-onboarding': {
      // Onboarding page handles its own initialization
      break;
    }
    case 'admin': {
      const { initAdminDashboard } = await import('./views/admin/index.ts');
      initAdminDashboard();
      break;
    }
    case 'haven-ai': {
      const { initHavenAIPage } = await import('./views/public/haven-ai.ts');
      initHavenAIPage();
      break;
    }
    case 'public':
    default: {
      const { initPublicViews } = await import('./views/public/index.ts');
      initPublicViews();
      break;
    }
  }
}

// Initialize on DOM ready
function initialize() {
  detectAndInitialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize immediately
  initialize();
}
