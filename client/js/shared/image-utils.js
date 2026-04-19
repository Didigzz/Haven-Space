/**
 * Image Utilities
 * Handles image paths and fallbacks consistently across the application
 */

import CONFIG from '../config.js';

/**
 * Get the correct placeholder image path
 * @returns {string} Absolute path to placeholder image
 */
export function getPlaceholderImage() {
  return '/assets/images/placeholder-room.svg';
}

/**
 * Get a valid image URL or fallback to placeholder
 * @param {string|null|undefined} imageUrl - The image URL to validate
 * @returns {string} Valid image URL or placeholder
 */
export function getImageUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === '') {
    return getPlaceholderImage();
  }

  // If it's already a full URL (http/https), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it starts with /storage/, prepend API base URL for uploaded files
  // This ensures storage files are accessed through the PHP router
  if (imageUrl.startsWith('/storage/')) {
    return `${CONFIG.API_BASE_URL}${imageUrl}`;
  }

  // If it starts with /assets/, return as-is (served through router)
  if (imageUrl.startsWith('/assets/')) {
    return imageUrl;
  }

  // If it starts with assets/, add leading slash
  if (imageUrl.startsWith('assets/')) {
    return `/${imageUrl}`;
  }

  // If it starts with /client/assets/, convert to /assets/
  if (imageUrl.startsWith('/client/assets/')) {
    return imageUrl.replace('/client/assets/', '/assets/');
  }

  // If it starts with client/assets/, convert to /assets/
  if (imageUrl.startsWith('client/assets/')) {
    return imageUrl.replace('client/assets/', '/assets/');
  }

  // Otherwise, assume it's a relative path and make it absolute
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

/**
 * Set image source with automatic fallback to placeholder
 * @param {HTMLImageElement} imgElement - The image element
 * @param {string|null|undefined} imageUrl - The image URL
 */
export function setImageWithFallback(imgElement, imageUrl) {
  if (!imgElement) return;

  const validUrl = getImageUrl(imageUrl);
  imgElement.src = validUrl;

  // Set up error handler to use placeholder
  imgElement.onerror = function () {
    if (this.src !== getPlaceholderImage()) {
      this.src = getPlaceholderImage();
    }
  };
}

/**
 * Create an image element with automatic fallback
 * @param {string|null|undefined} imageUrl - The image URL
 * @param {string} alt - Alt text for the image
 * @param {string} className - CSS class name(s)
 * @returns {HTMLImageElement} Image element with fallback configured
 */
export function createImageElement(imageUrl, alt = '', className = '') {
  const img = document.createElement('img');
  img.alt = alt;
  if (className) {
    img.className = className;
  }
  setImageWithFallback(img, imageUrl);
  return img;
}

/**
 * Get inline onerror handler string for use in template literals
 * @returns {string} JavaScript code for onerror handler
 */
export function getImageErrorHandler() {
  return `this.onerror=null;this.src='/assets/images/placeholder-room.svg'`;
}
