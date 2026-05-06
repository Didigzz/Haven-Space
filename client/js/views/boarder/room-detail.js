/**
 * Room Detail Page - Boarder Dashboard
 * Handles room details display, gallery, and booking functionality
 */

import { getImageUrl } from '../../shared/image-utils.js';
import CONFIG from '../../config.js';
import { initIconElements, getIcon } from '../../shared/icons.js';

// State management
const state = {
  currentImageIndex: 0,
  roomId: null,
  isFavorite: false,
  roomData: null, // Store fetched room data
};

/**
 * Initialize the Room Detail page
 */
export function initRoomDetail() {
  if (!document.querySelector('.room-detail-dashboard')) {
    return;
  }

  // Extract room ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  state.roomId = parseInt(urlParams.get('id')) || 1;

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupPage());
  } else {
    setupPage();
  }
}

/**
 * Setup the page with room data
 */
async function setupPage() {
  try {
    // Show loading state
    showLoadingState();

    // Fetch room data from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/detail?id=${state.roomId}`);

    if (!response.ok) {
      if (response.status === 404) {
        showNotFound();
        return;
      }
      throw new Error('Failed to fetch property details');
    }

    const result = await response.json();
    state.roomData = result.data;

    // Populate page with fetched data
    populateRoomData(state.roomData);
    setupGallery(); // This will setup prev/next buttons and other gallery features
    setupEventListeners(state.roomData);
  } catch (error) {
    showNotFound();
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.style.opacity = '0.5';
    content.style.pointerEvents = 'none';
  }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
  }
}

/**
 * Populate room data into the page
 */
function populateRoomData(room) {
  // Hide loading state
  hideLoadingState();

  // Update page title
  document.title = `${room.title} - Haven Space`;

  // Update breadcrumb
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = room.title;
  }

  // Update room details
  const roomTitle = document.getElementById('room-title');
  if (roomTitle) roomTitle.textContent = room.title;

  // Update badges
  const badgesContainer = document.querySelector('.room-detail-badges');
  if (badgesContainer && room.badges && room.badges.length > 0) {
    badgesContainer.innerHTML = room.badges
      .map(badge => {
        const badgeClass =
          badge === 'verified'
            ? 'room-badge-verified'
            : badge === 'new'
            ? 'room-badge-new'
            : badge === 'promo'
            ? 'room-badge-promo'
            : '';
        const badgeText =
          badge === 'verified'
            ? 'Verified Property'
            : badge === 'new'
            ? 'New Listing'
            : badge === 'promo'
            ? 'Promo'
            : badge;
        const badgeIcon =
          badge === 'verified'
            ? '<span data-icon="badgeCheck" data-icon-width="16" data-icon-height="16"></span>'
            : '';

        return `
          <span class="room-badge ${badgeClass}">
            ${badgeIcon}
            ${badgeText}
          </span>
        `;
      })
      .join('');
  } else if (badgesContainer) {
    badgesContainer.innerHTML = '';
  }

  const roomAddress = document.getElementById('room-address');
  if (roomAddress) {
    const fullAddress = [room.address, room.city, room.province].filter(Boolean).join(', ');
    roomAddress.textContent = fullAddress;
  }

  const roomRating = document.getElementById('room-rating');
  const roomRatingContainer = document.querySelector('.room-detail-rating');
  if (roomRating && room.rating && room.reviews > 0) {
    roomRating.textContent = room.rating;
    if (roomRatingContainer) roomRatingContainer.style.display = 'flex';
  } else {
    if (roomRatingContainer) roomRatingContainer.style.display = 'none';
  }

  const roomReviews = document.getElementById('room-reviews');
  if (roomReviews && room.reviews > 0) {
    roomReviews.textContent = `(${room.reviews} reviews)`;
  } else if (roomReviews) {
    roomReviews.textContent = '(No reviews yet)';
  }

  const roomDistance = document.getElementById('room-distance');
  if (roomDistance) {
    // Hide distance element if not available
    const distanceContainer = roomDistance.closest('.room-detail-distance');
    if (room.distance) {
      roomDistance.textContent = room.distance;
      if (distanceContainer) distanceContainer.style.display = 'flex';
    } else {
      if (distanceContainer) distanceContainer.style.display = 'none';
    }
  }

  const roomTypes = document.getElementById('room-types');
  if (roomTypes) roomTypes.textContent = room.roomTypes || 'Available';

  const roomAvailability = document.getElementById('room-availability');
  if (roomAvailability)
    roomAvailability.textContent = room.availability || 'Contact for availability';

  const roomPrice = document.getElementById('room-price');
  if (roomPrice) roomPrice.textContent = `₱${room.price.toLocaleString()}`;

  const bookingAvailability = document.getElementById('booking-availability');
  if (bookingAvailability)
    bookingAvailability.textContent = room.availability || 'Contact for availability';

  const roomDescription = document.getElementById('room-description');
  if (roomDescription) {
    roomDescription.innerHTML = room.description
      .split('\n\n')
      .map(p => `<p>${p}</p>`)
      .join('');
  }

  // Update amenities
  const roomAmenities = document.getElementById('room-amenities');
  if (roomAmenities && room.amenities && room.amenities.length > 0) {
    roomAmenities.innerHTML = room.amenities
      .map(amenity => {
        const amenityName = typeof amenity === 'string' ? amenity : amenity.label;
        const amenityIcon = typeof amenity === 'object' ? amenity.icon : 'check';
        return `
            <div class="amenity-item">
              <span data-icon="${amenityIcon}" data-icon-width="20" data-icon-height="20"></span>
              <span>${amenityName}</span>
            </div>
          `;
      })
      .join('');
  } else if (roomAmenities) {
    roomAmenities.innerHTML =
      '<p style="color: #6b7280;">No amenities listed for this property.</p>';
  }

  // Update property rules (formerly house rules)
  const rulesContainer = document.getElementById('room-property-rules');
  if (rulesContainer && room.houseRules && room.houseRules.length > 0) {
    rulesContainer.innerHTML = room.houseRules
      .map(rule => {
        const ruleTitle = typeof rule === 'string' ? rule : rule.title;
        const ruleDesc = typeof rule === 'object' ? rule.desc : '';
        const ruleIcon = typeof rule === 'object' ? rule.icon : 'check';
        return `
            <div class="rule-item">
              <span data-icon="${ruleIcon}" data-icon-width="20" data-icon-height="20"></span>
              <div class="rule-content">
                <h4>${ruleTitle}</h4>
                ${ruleDesc ? `<p>${ruleDesc}</p>` : ''}
              </div>
            </div>
          `;
      })
      .join('');
  } else if (rulesContainer && room.propertyRules) {
    // If propertyRules is a plain text field, display it
    rulesContainer.innerHTML = `<p>${room.propertyRules}</p>`;
  } else if (rulesContainer) {
    rulesContainer.innerHTML = '<p style="color: #6b7280;">No property rules specified.</p>';
  }

  // Update gender preferences
  const genderPreferenceContainer = document.getElementById('room-gender-preference');
  if (genderPreferenceContainer) {
    const genderPref = room.genderPreference || 'any';
    let genderText = '';
    let genderIcon = 'users';

    switch (genderPref.toLowerCase()) {
      case 'male':
        genderText = 'Male Only';
        genderIcon = 'user';
        break;
      case 'female':
        genderText = 'Female Only';
        genderIcon = 'user';
        break;
      case 'any':
      default:
        genderText = 'Open to All Genders';
        genderIcon = 'users';
        break;
    }

    genderPreferenceContainer.innerHTML = `
      <div class="rule-item">
        <span data-icon="${genderIcon}" data-icon-width="20" data-icon-height="20"></span>
        <div class="rule-content">
          <h4>${genderText}</h4>
          <p>This property accepts ${genderText.toLowerCase()} boarders.</p>
        </div>
      </div>
    `;
  }

  // Update landlord info
  const landlordName = document.getElementById('landlord-name');
  if (landlordName && room.landlord) {
    landlordName.textContent = room.landlord.name || 'Property Owner';
  }

  // Update landlord stats
  const landlordStats = document.querySelectorAll('.landlord-stat-value');
  if (landlordStats.length >= 2 && room.landlord) {
    landlordStats[0].textContent = room.landlord.properties || '0';
    landlordStats[1].textContent = room.landlord.rating || '0';
  }

  // Update gallery images
  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage && room.images && room.images.length > 0) {
    mainImage.src = getImageUrl(room.images[0]);
    mainImage.alt = `${room.title} - Main View`;
    mainImage.onerror = function () {
      this.src = getImageUrl(null);
    };
  } else if (mainImage) {
    mainImage.src = getImageUrl(null);
    mainImage.alt = 'No image available';
  }

  // Update thumbnails
  const thumbnailsContainer = document.getElementById('gallery-thumbnails');
  if (thumbnailsContainer && room.images && room.images.length > 0) {
    thumbnailsContainer.innerHTML = room.images
      .map(
        (img, index) => `
          <button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${getImageUrl(img)}" alt="Thumbnail ${index + 1}" />
          </button>
        `
      )
      .join('');

    // Setup gallery navigation after thumbnails are created
    setupGalleryNavigation();
  }

  // Update booking section with room types - grouped by type
  if (room.rooms && room.rooms.length > 0) {
    const roomTypeOptions = document.querySelector('.booking-room-type-options');
    if (roomTypeOptions) {
      // Group rooms by type
      const roomsByType = {};
      room.rooms.forEach(r => {
        const type = r.roomType || 'Other';
        if (!roomsByType[type]) {
          roomsByType[type] = [];
        }
        roomsByType[type].push(r);
      });

      // Get all unique room types (show all, not just available)
      const allTypes = Object.keys(roomsByType);

      if (allTypes.length > 0) {
        roomTypeOptions.innerHTML = allTypes
          .map(type => {
            const roomsOfType = roomsByType[type];
            const minPrice = Math.min(...roomsOfType.map(r => r.price));
            const maxPrice = Math.max(...roomsOfType.map(r => r.price));
            const priceDisplay =
              minPrice === maxPrice
                ? `₱${minPrice.toLocaleString()}/mo`
                : `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}/mo`;

            // Determine icon based on type
            const icon = type.toLowerCase().includes('single')
              ? 'user'
              : type.toLowerCase().includes('shared')
              ? 'users'
              : type.toLowerCase().includes('private')
              ? 'home'
              : 'home';

            return `
              <button class="booking-room-option booking-room-type-btn" data-room-type="${type}" type="button">
                <div class="booking-room-type-content">
                  <div class="booking-room-type-info">
                    <span data-icon="${icon}" data-icon-width="18" data-icon-height="18"></span>
                    <span class="booking-room-type-label">${capitalizeFirstLetter(type)}</span>
                  </div>
                  <span class="booking-room-type-price">${priceDisplay}</span>
                </div>
              </button>
            `;
          })
          .join('');

        // Note: Click handlers for scrolling are added in setupEventListeners()
        // No modal handlers needed here - buttons only scroll to Available Rooms
      } else {
        roomTypeOptions.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: #6b7280;">
            No rooms currently available
          </div>
        `;
      }
    }
  } else {
    // No rooms data, show message
    const roomTypeOptions = document.querySelector('.booking-room-type-options');
    if (roomTypeOptions) {
      roomTypeOptions.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #6b7280;">
          Contact landlord for room availability
        </div>
      `;
    }
  }

  // Update property type
  const propertyTypeElement = document.querySelector(
    '.quick-info-card:nth-child(3) .quick-info-value'
  );
  if (propertyTypeElement) {
    // Map property type to display format
    const typeMapping = {
      'boarding-house': 'Boarding House',
      dormitory: 'Dormitory',
      apartment: 'Apartment',
      studio: 'Studio Unit',
      condominium: 'Condominium',
      bedspace: 'Bed Space',
      others: 'Others',
    };
    const displayType = typeMapping[room.propertyType] || room.propertyType || 'Boarding House';
    propertyTypeElement.textContent = displayType;
  }

  const depositElements = document.querySelectorAll('.booking-info-item strong');
  if (depositElements.length >= 2) {
    depositElements[1].textContent = room.deposit || 'Contact for details';
  }

  // Update advance field
  const advanceElement = document.getElementById('booking-advance');
  if (advanceElement) {
    advanceElement.textContent = room.advance || '1 month';
  }

  // Update reviews
  const reviewsAverage = document.getElementById('reviews-average');
  if (reviewsAverage) reviewsAverage.textContent = room.rating || '0';

  const reviewsTotal = document.getElementById('reviews-total');
  if (reviewsTotal) reviewsTotal.textContent = room.reviews || '0';

  // Update rating breakdown - hide if no reviews
  const ratingBreakdown = document.querySelector('.rating-breakdown');
  if (ratingBreakdown && (!room.reviews || room.reviews === 0)) {
    ratingBreakdown.style.display = 'none';
  }

  // Initialize icons
  initIconElements();

  // Load available rooms
  loadAvailableRooms(room);

  // Setup room filter dropdown
  setupRoomFilter(room);

  // Load similar properties
  loadSimilarProperties(room.id);

  // Update main Apply Now button based on room availability
  updateMainApplyButton(room);
}

/**
 * Setup gallery navigation (called after thumbnails are created)
 */
function setupGalleryNavigation() {
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  // Thumbnails - add event listeners to newly created thumbnails
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      state.currentImageIndex = parseInt(thumb.dataset.index);
      updateGalleryImage();
    });
  });
}

/**
 * Setup gallery functionality
 */
async function setupGallery() {
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  // Previous button
  const prevBtn = document.getElementById('gallery-prev');
  if (prevBtn) {
    // Remove any existing event listeners to prevent duplicates
    prevBtn.replaceWith(prevBtn.cloneNode(true));
    const newPrevBtn = document.getElementById('gallery-prev');
    newPrevBtn.addEventListener('click', () => {
      state.currentImageIndex =
        (state.currentImageIndex - 1 + room.images.length) % room.images.length;
      updateGalleryImage();
    });
  }

  // Next button
  const nextBtn = document.getElementById('gallery-next');
  if (nextBtn) {
    // Remove any existing event listeners to prevent duplicates
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    const newNextBtn = document.getElementById('gallery-next');
    newNextBtn.addEventListener('click', () => {
      state.currentImageIndex = (state.currentImageIndex + 1) % room.images.length;
      updateGalleryImage();
    });
  }

  // Thumbnails - wait for DOM to be ready
  setTimeout(() => {
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        state.currentImageIndex = parseInt(thumb.dataset.index);
        updateGalleryImage();
      });
    });
  }, 100);

  // Favorite button
  const favoriteBtn = document.getElementById('gallery-favorite');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      state.isFavorite = !state.isFavorite;
      favoriteBtn.dataset.favorite = state.isFavorite.toString();

      const icon = favoriteBtn.querySelector('[data-icon]');
      if (icon) {
        icon.setAttribute('data-icon', state.isFavorite ? 'bookmarkSolid' : 'bookmark');
      }

      if (state.isFavorite) {
        favoriteBtn.classList.add('active');
      } else {
        favoriteBtn.classList.remove('active');
      }
    });
  }

  // Toggle button for map view
  const toggleBtn = document.getElementById('toggle-view-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleView();
    });
  }

  // Back to gallery button
  const backBtn = document.getElementById('back-to-gallery-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      toggleView();
    });
  }
}

/**
 * Initialize Leaflet map for the property location
 */
function initLeafletMap() {
  const room = state.roomData;

  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded');
    return;
  }

  // Check if map is already initialized
  if (window.roomDetailMap) {
    return;
  }

  const mapContainer = document.getElementById('leaflet-map');
  if (!mapContainer) {
    return;
  }

  try {
    // Use room coordinates if available, otherwise use default coordinates (Quezon City, Philippines)
    const latitude = room && room.latitude ? room.latitude : 14.676;
    const longitude = room && room.longitude ? room.longitude : 121.0437;

    // Initialize map centered on property location
    window.roomDetailMap = L.map('leaflet-map').setView([latitude, longitude], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 10,
    }).addTo(window.roomDetailMap);

    // Add marker for the property
    const markerTitle = room && room.title ? room.title : 'Property Location';
    const markerAddress = room && room.address ? room.address : 'Quezon City, Philippines';

    L.marker([latitude, longitude])
      .addTo(window.roomDetailMap)
      .bindPopup(`<b>${markerTitle}</b><br>${markerAddress}`)
      .openPopup();
  } catch (error) {
    console.error('Error in toggleView:', error);
  }
}

/**
 * Toggle between gallery and map view
 */
function toggleView() {
  const gallerySection = document.querySelector('.room-detail-gallery');
  const mapSection = document.getElementById('room-map');

  if (gallerySection && mapSection) {
    const isMapVisible = mapSection.style.display === 'block';
    const toggleText = document.getElementById('toggle-text');
    const toggleIcon = document.getElementById('toggle-icon');

    if (isMapVisible) {
      // Switch to gallery view
      gallerySection.style.display = 'block';
      mapSection.style.display = 'none';
      if (toggleText) toggleText.textContent = 'Show Map';

      // Update icon to map
      if (toggleIcon) {
        const mapIcon = getIcon('map', { width: 18, height: 18 });
        toggleIcon.innerHTML = mapIcon;
      }
    } else {
      // Switch to map view
      gallerySection.style.display = 'none';
      mapSection.style.display = 'block';
      if (toggleText) toggleText.textContent = 'Show Gallery';

      // Update icon to photo
      if (toggleIcon) {
        const photoIcon = getIcon('photo', { width: 18, height: 18 });
        toggleIcon.innerHTML = photoIcon;
      }

      // Initialize Leaflet map when shown
      setTimeout(() => {
        initLeafletMap();
      }, 100);
    }
  }
}

/**
 * Update gallery main image
 */
function updateGalleryImage() {
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    const newImageUrl = getImageUrl(room.images[state.currentImageIndex]);
    mainImage.src = newImageUrl;
    mainImage.onerror = function () {
      this.src = getImageUrl(null);
    };
  }

  // Update thumbnail active state
  document.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
    if (index === state.currentImageIndex) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners(room) {
  // Apply Now button - scroll to Available Rooms section first
  const applyBtn = document.getElementById('apply-now-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      scrollToAvailableRooms();
      // Optional: Still handle apply after scroll if needed
      // setTimeout(() => handleApplyNow(room), 500);
    });
  }

  // Schedule Tour button
  const scheduleTourBtn = document.getElementById('schedule-tour-btn');
  if (scheduleTourBtn) {
    scheduleTourBtn.addEventListener('click', () => handleScheduleTour(room));
  }

  // Contact Landlord button
  const contactLandlordBtn = document.getElementById('contact-landlord-btn');
  if (contactLandlordBtn) {
    contactLandlordBtn.addEventListener('click', () => handleContactLandlord(room));
  }

  // Room type options - scroll to Available Rooms section when clicked
  const roomTypeOptions = document.querySelectorAll('.booking-room-option, .booking-room-type-btn');
  roomTypeOptions.forEach(option => {
    option.addEventListener('click', e => {
      e.preventDefault();
      scrollToAvailableRooms();
    });
  });
}

/**
 * Update main Apply Now button based on room availability
 */
function updateMainApplyButton(property) {
  const applyBtn = document.getElementById('apply-now-btn');
  if (!applyBtn) return;

  // Check if there are any available rooms
  const hasAvailableRooms =
    property.rooms &&
    property.rooms.some(room => room.status && room.status.toLowerCase() === 'available');

  if (!hasAvailableRooms) {
    // Disable the button if no rooms are available
    applyBtn.disabled = true;
    applyBtn.style.opacity = '0.5';
    applyBtn.style.cursor = 'not-allowed';
    applyBtn.style.backgroundColor = '#9ca3af';
    applyBtn.style.color = '#ffffff';
    applyBtn.title = 'No rooms currently available';

    // Update button text
    const buttonText = applyBtn.querySelector('span:not([data-icon])') || applyBtn;
    if (buttonText.textContent) {
      buttonText.textContent = 'No Rooms Available';
    }
  } else {
    // Enable the button if rooms are available
    applyBtn.disabled = false;
    applyBtn.style.opacity = '1';
    applyBtn.style.cursor = 'pointer';
    applyBtn.style.backgroundColor = '';
    applyBtn.style.color = '';
    applyBtn.title = '';

    // Reset button text
    const buttonText = applyBtn.querySelector('span:not([data-icon])') || applyBtn;
    if (buttonText.textContent && buttonText.textContent.includes('No Rooms')) {
      buttonText.textContent = 'Apply Now';
    }
  }
}

/**
 * Scroll to Available Rooms section
 */
function scrollToAvailableRooms() {
  const availableRoomsSection = document.querySelector('.available-rooms-section');
  if (availableRoomsSection) {
    availableRoomsSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}

/**
 * Handle Apply Now action
 */

/**
 * Handle Schedule Tour action
 */
function handleScheduleTour(room) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || user.role !== 'boarder') {
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/auth/login.html'
      : '/views/public/auth/login.html';

    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${basePath}?redirect=${redirectUrl}`;
    return;
  }

  // TODO: Implement tour scheduling modal/form
  alert(`Schedule a tour for ${room.title}. (Feature coming soon)`);
}

/**
 * Handle Contact Landlord action
 */
function handleContactLandlord(room) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || user.role !== 'boarder') {
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/auth/login.html'
      : '/views/public/auth/login.html';

    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${basePath}?redirect=${redirectUrl}`;
    return;
  }

  // TODO: Redirect to messages page with landlord
  alert(`Contact landlord for ${room.title}. (Integration pending)`);

  const basePath = window.location.pathname.includes('github.io')
    ? '/Haven-Space/client/views/boarder/messages/index.html'
    : '/views/boarder/messages/index.html';

  window.location.href = basePath;
}

/**
 * Load similar properties
 */
async function loadSimilarProperties(propertyId) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/rooms/similar?id=${propertyId}&limit=3`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch similar properties');
    }

    const result = await response.json();
    const similarProperties = result.data || [];

    // Get the similar properties container
    const similarPropertiesContainer = document.getElementById('similar-properties');

    if (similarPropertiesContainer) {
      if (similarProperties.length > 0) {
        similarPropertiesContainer.innerHTML = similarProperties
          .map(
            property => `
            <div class="similar-property-card" data-property-id="${property.id}">
              <div class="similar-property-image-wrapper">
                <img
                  src="${property.coverImage || '/assets/images/placeholder-room.svg'}"
                  alt="${property.title}"
                  class="similar-property-image"
                />
                <div class="similar-property-badges">
                  ${
                    property.rating >= 4.5
                      ? `
                    <span class="similar-property-badge similar-property-badge-verified">
                      <span data-icon="badgeCheck" data-icon-width="14" data-icon-height="14"></span>
                      Verified
                    </span>
                  `
                      : ''
                  }
                </div>
              </div>
              <div class="similar-property-content">
                <h3 class="similar-property-title">${property.title}</h3>
                <div class="similar-property-location">
                  <span data-icon="location" data-icon-width="16" data-icon-height="16"></span>
                  <span>${property.city || property.address || 'N/A'}</span>
                </div>
                <div class="similar-property-meta">
                  <div class="similar-property-rating">
                    <span data-icon="starSolid" data-icon-width="14" data-icon-height="14"></span>
                    <span>${property.rating || 'New'}</span>
                    <span class="similar-property-rating-count">(${
                      property.reviewCount || 0
                    })</span>
                  </div>
                  <div class="similar-property-price">
                    <span class="similar-property-price-amount">₱${
                      property.price ? property.price.toLocaleString() : 'N/A'
                    }</span>
                    <span class="similar-property-price-period">/mo</span>
                  </div>
                </div>
              </div>
            </div>
          `
          )
          .join('');

        // Add event listeners to the new cards
        document.querySelectorAll('.similar-property-card').forEach(card => {
          card.addEventListener('click', () => {
            const propertyId = card.dataset.propertyId;
            if (propertyId) {
              // Force a full page reload to ensure fresh data
              window.location.href = `detail.html?id=${propertyId}`;
            }
          });
        });

        // Initialize icons for similar property cards
        initIconElements();
      } else {
        // Show message when no similar properties are available
        similarPropertiesContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-gray);">
            <p>No similar properties found at this time.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading similar properties:', error);
    const similarPropertiesContainer = document.getElementById('similar-properties');
    if (similarPropertiesContainer) {
      similarPropertiesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-gray);">
          <p>Unable to load similar properties.</p>
        </div>
      `;
    }
  }
}

/**
 * Load available rooms for the property
 */
function loadAvailableRooms(property, filter = 'all') {
  const roomsGrid = document.getElementById('available-rooms-grid');
  if (!roomsGrid) return;

  // Check if property has rooms data
  if (!property.rooms || property.rooms.length === 0) {
    roomsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-gray);">
        <p>No room details available for this property.</p>
      </div>
    `;
    return;
  }

  // Filter rooms based on the selected filter
  let filteredRooms = property.rooms;
  if (filter !== 'all') {
    filteredRooms = property.rooms.filter(room => {
      const roomType = room.roomType ? room.roomType.toLowerCase() : '';
      return roomType.includes(filter);
    });
  }

  // Show message if no rooms match the filter
  if (filteredRooms.length === 0) {
    roomsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-gray);">
        <p>No rooms match the selected filter.</p>
      </div>
    `;
    return;
  }

  // Render room cards
  roomsGrid.innerHTML = filteredRooms
    .map(room => {
      const statusClass =
        room.status === 'available'
          ? 'available'
          : room.status === 'occupied'
          ? 'occupied'
          : 'limited';
      const statusText =
        room.status === 'available'
          ? 'Available'
          : room.status === 'occupied'
          ? 'Occupied'
          : 'Limited';
      const roomImage =
        room.images && room.images.length > 0 ? getImageUrl(room.images[0]) : getImageUrl(null);
      const roomDescription = room.description || '';
      const roomSize = room.size ? `${room.size} sqm` : null;
      const furnishing =
        room.furnishing && room.furnishing !== 'Not specified' ? room.furnishing : null;
      // Use roomType for display (Shared, Single, Private, etc.)
      const roomType =
        room.roomType && room.roomType !== 'N/A' ? capitalizeFirstLetter(room.roomType) : 'Room';
      // Use roomNumber as the individual room name if available
      const roomNumber = room.roomNumber && room.roomNumber !== 'N/A' ? room.roomNumber : null;
      // Primary display: individual room name if available, otherwise fall back to room type
      const displayName = roomNumber || roomType;

      return `
        <div class="available-room-card" data-room-id="${room.id}" data-room='${JSON.stringify(
        room
      ).replace(/'/g, '&apos;')}'>
          <div class="available-room-image-wrapper">
            <img src="${roomImage}" alt="${displayName}" class="available-room-image" />
            <span class="available-room-status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="available-room-content">
            <div class="available-room-header">
              <div class="available-room-name-group">
                <h3 class="available-room-name">${displayName}</h3>
                <span class="available-room-type-label">${roomType}</span>
              </div>
              <div class="available-room-price">
                <span class="available-room-price-amount">₱${room.price.toLocaleString()}</span>
                <span class="available-room-price-period">/mo</span>
              </div>
            </div>
            <div class="available-room-details">
              <div class="available-room-detail">
                <span data-icon="users" data-icon-width="16" data-icon-height="16"></span>
                <span>${room.capacity} ${room.capacity > 1 ? 'persons' : 'person'}</span>
              </div>
              ${
                roomSize
                  ? `
              <div class="available-room-detail">
                <span data-icon="square" data-icon-width="16" data-icon-height="16"></span>
                <span>${roomSize}</span>
              </div>`
                  : ''
              }
              ${
                furnishing
                  ? `
              <div class="available-room-detail">
                <span data-icon="home" data-icon-width="16" data-icon-height="16"></span>
                <span>${furnishing}</span>
              </div>`
                  : ''
              }
              ${
                room.deposit > 0
                  ? `
              <div class="available-room-detail">
                <span data-icon="currencyDollar" data-icon-width="16" data-icon-height="16"></span>
                <span>Deposit: ₱${room.deposit.toLocaleString()}</span>
              </div>`
                  : ''
              }
            </div>
            ${roomDescription ? `<p class="available-room-description">${roomDescription}</p>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  // Initialize icons for room cards
  initIconElements();

  // Add click event listeners to room cards
  document.querySelectorAll('.available-room-card').forEach(card => {
    const roomData = JSON.parse(card.dataset.room);
    const isOccupied = roomData.status && roomData.status.toLowerCase() === 'occupied';

    if (isOccupied) {
      // Make occupied rooms non-clickable
      card.style.cursor = 'not-allowed';
      card.style.opacity = '0.7';
      card.title = 'This room is currently occupied';

      // Add occupied styling
      card.classList.add('room-occupied');
    } else {
      // Add click event listener for available rooms
      card.addEventListener('click', () => {
        showRoomDetailModal(roomData, property);
      });
    }
  });
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show room type modal with detailed room information
 */

/**
 * Setup room type modal event listeners
 */

/**
 * Show room detail modal
 */
function showRoomDetailModal(room, property) {
  const modal = document.getElementById('room-detail-modal');
  if (!modal) return;

  // Populate modal with room data
  const modalTitle = document.getElementById('modal-room-title');
  const roomName =
    room.roomType && room.roomType !== 'N/A'
      ? room.roomType
      : room.roomNumber && room.roomNumber !== 'N/A'
      ? room.roomNumber
      : 'Room';
  const roomType = room.roomType && room.roomType !== 'N/A' ? room.roomType : 'Standard';
  if (modalTitle) modalTitle.textContent = roomName;

  // Update status badge
  const statusBadge = document.getElementById('modal-room-status');
  if (statusBadge) {
    const statusClass = room.status === 'available' ? 'available' : 'occupied';
    const statusText = room.status === 'available' ? 'Available' : 'Occupied';
    statusBadge.className = `room-modal-status-badge ${statusClass}`;
    statusBadge.textContent = statusText;
  }

  // Update price
  const priceAmount = document.getElementById('modal-room-price');
  if (priceAmount) priceAmount.textContent = `₱${room.price.toLocaleString()}`;

  // Update capacity
  const capacity = document.getElementById('modal-room-capacity');
  if (capacity)
    capacity.textContent = `${room.capacity}\u00A0${room.capacity > 1 ? 'persons' : 'person'}`;

  // Update room type
  const modalRoomType = document.getElementById('modal-room-type');
  if (modalRoomType) modalRoomType.textContent = roomType;

  // Update status
  const modalRoomStatusValue = document.getElementById('modal-room-status-value');
  if (modalRoomStatusValue) {
    const statusText =
      room.status === 'available'
        ? 'Available'
        : room.status === 'occupied'
        ? 'Occupied'
        : 'Maintenance';
    modalRoomStatusValue.textContent = statusText;
  }

  // Update deposit
  const deposit = document.getElementById('modal-room-deposit');
  if (deposit) deposit.textContent = room.deposit || 'Not specified';

  // Update furnishing - hide if not specified
  const furnishing = document.getElementById('modal-room-furnishing');
  const furnishingItem = furnishing?.closest('.room-modal-detail-item');
  if (room.furnishing && room.furnishing !== 'Not specified') {
    if (furnishing) furnishing.textContent = room.furnishing;
    if (furnishingItem) furnishingItem.style.display = '';
  } else {
    if (furnishingItem) furnishingItem.style.display = 'none';
  }

  // Update description
  const description = document.getElementById('modal-room-description');
  if (description) description.textContent = room.description || 'No description available.';

  // Update gallery
  const mainImage = document.getElementById('modal-main-image');
  const thumbnailsContainer = document.getElementById('modal-thumbnails');

  const roomImages = room.images || [];

  if (roomImages && roomImages.length > 0) {
    if (mainImage) {
      mainImage.src = getImageUrl(roomImages[0]);
      mainImage.alt = roomName;
    }

    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = roomImages
        .map(
          (img, index) => `
          <img
            src="${getImageUrl(img)}"
            alt="${roomName} ${index + 1}"
            class="room-modal-thumbnail ${index === 0 ? 'active' : ''}"
            data-index="${index}"
          />
        `
        )
        .join('');

      // Add thumbnail click handlers
      thumbnailsContainer.querySelectorAll('.room-modal-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const index = parseInt(thumb.dataset.index);
          if (mainImage) {
            mainImage.src = getImageUrl(roomImages[index]);
          }
          thumbnailsContainer
            .querySelectorAll('.room-modal-thumbnail')
            .forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
      });
    }
  } else {
    if (mainImage) {
      mainImage.src = getImageUrl(null);
      mainImage.alt = 'No image available';
    }
    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = '';
    }
  }

  // Update amenities
  const amenitiesList = document.getElementById('modal-amenities-list');
  const amenitiesSection = document.getElementById('modal-room-amenities');

  const roomAmenities = room.amenities || [];

  if (roomAmenities && roomAmenities.length > 0) {
    if (amenitiesList) {
      amenitiesList.innerHTML = roomAmenities
        .map(amenity => {
          const amenityName = typeof amenity === 'string' ? amenity : amenity.label;
          const amenityIcon = typeof amenity === 'object' ? amenity.icon : 'check';
          return `
            <div class="room-modal-amenity-item">
              <span data-icon="${amenityIcon}" data-icon-width="18" data-icon-height="18"></span>
              <span>${amenityName}</span>
            </div>
          `;
        })
        .join('');
    }
    if (amenitiesSection) amenitiesSection.style.display = 'block';
  } else {
    if (amenitiesSection) amenitiesSection.style.display = 'none';
  }

  // Initialize icons in modal
  initIconElements();

  // Show modal
  modal.classList.add('active');

  // Setup modal event listeners
  setupRoomModalListeners(room, property, modal);
}

/**
 * Setup room modal event listeners
 */
function setupRoomModalListeners(room, property, _modal) {
  // Get the modal overlay
  const modalOverlay = document.getElementById('room-detail-modal');

  // Close button
  const closeBtn = document.getElementById('close-room-modal');
  if (closeBtn) {
    // Remove old event listeners by cloning
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    newCloseBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
  }

  // Apply button
  const applyBtn = document.getElementById('modal-apply-btn');
  if (applyBtn) {
    // Check if room is occupied
    const roomStatus = (room.status || '').toLowerCase();
    const isOccupied = roomStatus === 'occupied';

    // Remove old event listeners by cloning
    const newApplyBtn = applyBtn.cloneNode(true);

    // Disable button if room is occupied
    if (isOccupied) {
      newApplyBtn.disabled = true;
      newApplyBtn.style.opacity = '0.5';
      newApplyBtn.style.cursor = 'not-allowed';
      newApplyBtn.style.backgroundColor = '#9ca3af';
      newApplyBtn.style.color = '#ffffff';
      newApplyBtn.title = 'This room is currently occupied';
    } else {
      newApplyBtn.disabled = false;
      newApplyBtn.style.opacity = '1';
      newApplyBtn.style.cursor = 'pointer';
      newApplyBtn.style.backgroundColor = '';
      newApplyBtn.style.color = '';
      newApplyBtn.title = '';

      newApplyBtn.addEventListener('click', () => {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!user || !user.id || user.role !== 'boarder') {
          const redirectUrl = encodeURIComponent(window.location.href);
          window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
          return;
        }

        // Get room type from the correct property
        const roomType = room.room_type || room.roomType || 'Room';

        // Redirect to confirm-booking page with room details
        const params = new URLSearchParams({
          id: property.id || state.roomId,
          title: property.title || 'Property',
          price: room.price,
          address: property.address || '',
          landlordName: property.landlord?.name || 'Property Owner',
          roomType: roomType,
        });

        window.location.href = `../confirm-booking/index.html?${params.toString()}`;
      });
    }

    // Replace the button in the DOM
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
  }

  // Close on overlay click (keep this on the original modal overlay)
  const overlayClickHandler = e => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  };

  // Remove old listener and add new one
  modalOverlay.removeEventListener('click', overlayClickHandler);
  modalOverlay.addEventListener('click', overlayClickHandler);
}

/**
 * Show not found state
 */
function showNotFound() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.innerHTML = `
      <div class="room-detail-not-found">
        <span data-icon="home" data-icon-width="64" data-icon-height="64"></span>
        <h2>Room Not Found</h2>
        <p>The room you're looking for doesn't exist or has been removed.</p>
        <a href="../find-a-room/index.html" class="room-detail-back-btn">
          <span data-icon="arrowLeft" data-icon-width="20" data-icon-height="20"></span>
          Back to Find a Room
        </a>
      </div>
    `;
  }
}

/**
 * Setup room filter dropdown functionality
 */
function setupRoomFilter(property) {
  const filterBtn = document.getElementById('room-filter-btn');
  const filterPanel = document.getElementById('room-filter-panel');

  if (!filterBtn || !filterPanel) return;

  // Toggle filter panel visibility
  filterBtn.addEventListener('click', e => {
    e.stopPropagation();
    filterBtn.classList.toggle('active');
    filterPanel.classList.toggle('active');
  });

  // Close filter panel when clicking outside
  document.addEventListener('click', () => {
    filterBtn.classList.remove('active');
    filterPanel.classList.remove('active');
  });

  // Prevent clicks inside panel from closing it
  filterPanel.addEventListener('click', e => {
    e.stopPropagation();
  });

  // Handle filter option selection
  const filterOptions = document.querySelectorAll('.room-filter-option');
  filterOptions.forEach(option => {
    option.addEventListener('click', () => {
      const filterValue = option.dataset.filter;
      loadAvailableRooms(property, filterValue);

      // Update button text to show current filter
      const filterText = option.querySelector('label').textContent;
      filterBtn.querySelector('span:first-child').textContent = filterText;

      // Close the panel
      filterBtn.classList.remove('active');
      filterPanel.classList.remove('active');
    });
  });
}

// Initialize on module load for single-page apps
if (typeof window !== 'undefined') {
  window.initRoomDetail = initRoomDetail;

  // Auto-initialize if the room detail dashboard exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('.room-detail-dashboard')) {
        initRoomDetail();
      }
    });
  } else {
    // DOM already loaded
    if (document.querySelector('.room-detail-dashboard')) {
      initRoomDetail();
    }
  }
}
