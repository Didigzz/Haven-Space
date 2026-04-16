/**
 * Boarder Room Detail Initialization
 * Forces authenticated state for boarder users viewing room details
 */

import { initRoomDetail } from './room-detail.js';

/**
 * Initialize boarder room detail with forced authentication
 */
export function initBoarderRoomDetailAuth() {
  console.log('initBoarderRoomDetailAuth called');

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || !user.id) {
    // Redirect to login if not authenticated
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
    return;
  }

  console.log('User authenticated, initializing room detail');

  // Initialize the room detail functionality for authenticated boarders
  initRoomDetail();
}
