/**
 * Confirm Application Page
 * Handles application confirmation and submission for authenticated boarders
 */

import CONFIG from '../../config.js';
import { updateBoarderStatus } from '../../shared/routing.js';

// State management
const state = {
  propertyId: null,
  propertyData: null,
  selectedRoomType: 'single',
  monthlyRent: 0,
  securityDeposit: 0,
  advancePayment: 0,
};

/**
 * Initialize the confirm application page
 */
export function initConfirmApplication() {
  // Check authentication
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.id || user.role !== 'boarder') {
    // Redirect to login if not authenticated as boarder
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
    return;
  }

  // Extract property ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  state.propertyId = parseInt(urlParams.get('id'));

  if (!state.propertyId) {
    alert('Property ID not found');
    window.location.href = './index.html';
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPage);
  } else {
    setupPage();
  }
}

/**
 * Setup the page
 */
async function setupPage() {
  try {
    // Fetch property data
    await loadPropertyData();

    // Setup event listeners
    setupEventListeners();

    // Set minimum date for move-in date
    setMinMoveInDate();
  } catch (error) {
    console.error('Error setting up page:', error);
    alert('Failed to load property details. Please try again.');
    window.location.href = `./detail.html?id=${state.propertyId}`;
  }
}

/**
 * Load property data from API
 */
async function loadPropertyData() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/detail?id=${state.propertyId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch property details');
    }

    const result = await response.json();
    state.propertyData = result.data;

    // Populate property information
    populatePropertyData(state.propertyData);
  } catch (error) {
    console.error('Error loading property data:', error);
    // Use fallback data for development
    useFallbackData();
  }
}

/**
 * Use fallback data for development
 */
function useFallbackData() {
  state.propertyData = {
    id: state.propertyId,
    title: 'Sunrise Dormitory',
    address: 'Katipunan Avenue, Quezon City, Metro Manila',
    rating: 4.8,
    reviews: 24,
    price: 4500,
    sharedPrice: 3000,
    deposit: '2 months',
    images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80'],
    rooms: [
      { roomType: 'Single Room', price: 4500, capacity: 1, status: 'available' },
      { roomType: 'Shared Room', price: 3000, capacity: 2, status: 'available' },
    ],
  };

  populatePropertyData(state.propertyData);
}

/**
 * Populate property data into the page
 */
function populatePropertyData(property) {
  // Update property image
  const propertyImg = document.getElementById('property-img');
  if (propertyImg && property.images && property.images.length > 0) {
    propertyImg.src = property.images[0];
    propertyImg.alt = property.title;
  }

  // Update property title
  const propertyTitle = document.getElementById('property-title');
  if (propertyTitle) {
    propertyTitle.textContent = property.title;
  }

  // Update property address
  const propertyAddress = document.getElementById('property-address');
  if (propertyAddress) {
    const fullAddress = [property.address, property.city, property.province]
      .filter(Boolean)
      .join(', ');
    propertyAddress.textContent = fullAddress;
  }

  // Update rating
  const propertyRating = document.getElementById('property-rating');
  if (propertyRating && property.rating) {
    propertyRating.textContent = property.rating;
  }

  // Update reviews
  const propertyReviews = document.getElementById('property-reviews');
  if (propertyReviews && property.reviews) {
    propertyReviews.textContent = `(${property.reviews})`;
  }

  // Update room type options
  const roomTypeOptions = document.getElementById('room-type-options');
  if (roomTypeOptions && property.rooms && property.rooms.length > 0) {
    const availableRooms = property.rooms.filter(r => r.status === 'available');

    if (availableRooms.length > 0) {
      roomTypeOptions.innerHTML = availableRooms
        .map(
          (room, index) => `
          <label class="room-type-option">
            <input type="radio" name="room-type" value="${room.roomType}" ${
            index === 0 ? 'checked' : ''
          } data-price="${room.price}" data-room-id="${room.id}" />
            <div class="room-type-content">
              <div class="room-type-info">
                <span data-icon="${
                  room.capacity > 1 ? 'userGroup' : 'user'
                }" data-icon-width="20" data-icon-height="20"></span>
                <div class="room-type-text">
                  <span class="room-type-label">${room.roomType}</span>
                  <span class="room-type-desc">${
                    room.capacity > 1 ? 'Shared with other boarders' : 'Private room for one person'
                  }</span>
                </div>
              </div>
              <span class="room-type-price">₱${room.price.toLocaleString()}/mo</span>
            </div>
          </label>
        `
        )
        .join('');

      // Set initial price
      state.monthlyRent = availableRooms[0].price;
    }
  } else {
    // Fallback to default room types
    const singlePrice = property.price || 4500;
    const sharedPrice = property.sharedPrice || 3000;
    // Use property_id as fallback room_id since we don't have specific room IDs
    const fallbackRoomId = property.id || state.propertyId;

    roomTypeOptions.innerHTML = `
      <label class="room-type-option">
        <input type="radio" name="room-type" value="single" checked data-price="${singlePrice}" data-room-id="${fallbackRoomId}" />
        <div class="room-type-content">
          <div class="room-type-info">
            <span data-icon="user" data-icon-width="20" data-icon-height="20"></span>
            <div class="room-type-text">
              <span class="room-type-label">Single Room</span>
              <span class="room-type-desc">Private room for one person</span>
            </div>
          </div>
          <span class="room-type-price">₱${singlePrice.toLocaleString()}/mo</span>
        </div>
      </label>
      <label class="room-type-option">
        <input type="radio" name="room-type" value="shared" data-price="${sharedPrice}" data-room-id="${fallbackRoomId}" />
        <div class="room-type-content">
          <div class="room-type-info">
            <span data-icon="userGroup" data-icon-width="20" data-icon-height="20"></span>
            <div class="room-type-text">
              <span class="room-type-label">Shared Room</span>
              <span class="room-type-desc">Shared with other boarders</span>
            </div>
          </div>
          <span class="room-type-price">₱${sharedPrice.toLocaleString()}/mo</span>
        </div>
      </label>
    `;

    state.monthlyRent = singlePrice;
  }

  // Calculate costs
  updateCostSummary();
}

/**
 * Update cost summary
 */
function updateCostSummary() {
  const selectedRoomType = document.querySelector('input[name="room-type"]:checked');
  if (selectedRoomType) {
    state.monthlyRent = parseInt(selectedRoomType.dataset.price) || state.monthlyRent;
  }

  // Calculate deposit (2 months) and advance (1 month)
  state.securityDeposit = state.monthlyRent * 2;
  state.advancePayment = state.monthlyRent;

  // Update UI
  const monthlyRentEl = document.getElementById('monthly-rent');
  const securityDepositEl = document.getElementById('security-deposit');
  const advancePaymentEl = document.getElementById('advance-payment');
  const totalInitialEl = document.getElementById('total-initial');

  if (monthlyRentEl) {
    monthlyRentEl.textContent = `₱${state.monthlyRent.toLocaleString()}`;
  }

  if (securityDepositEl) {
    securityDepositEl.textContent = `₱${state.securityDeposit.toLocaleString()}`;
  }

  if (advancePaymentEl) {
    advancePaymentEl.textContent = `₱${state.advancePayment.toLocaleString()}`;
  }

  if (totalInitialEl) {
    const total = state.monthlyRent + state.securityDeposit + state.advancePayment;
    totalInitialEl.textContent = `₱${total.toLocaleString()}`;
  }
}

/**
 * Set minimum move-in date to today
 */
function setMinMoveInDate() {
  const moveInDateInput = document.getElementById('move-in-date');
  if (moveInDateInput) {
    const today = new Date().toISOString().split('T')[0];
    moveInDateInput.setAttribute('min', today);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Room type change
  document.querySelectorAll('input[name="room-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.selectedRoomType = radio.value;
      updateCostSummary();
    });
  });

  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = `./detail.html?id=${state.propertyId}`;
    });
  }

  // Submit button
  const submitBtn = document.getElementById('submit-btn');
  const termsCheckbox = document.getElementById('terms-checkbox');

  if (submitBtn && termsCheckbox) {
    // Enable/disable submit button based on terms checkbox
    termsCheckbox.addEventListener('change', () => {
      submitBtn.disabled = !termsCheckbox.checked;
    });

    // Initially disable submit button
    submitBtn.disabled = !termsCheckbox.checked;

    submitBtn.addEventListener('click', handleSubmit);
  }

  // Success modal buttons
  const browseMoreBtn = document.getElementById('browse-more-btn');
  const viewApplicationsBtn = document.getElementById('view-applications-btn');

  if (browseMoreBtn) {
    browseMoreBtn.addEventListener('click', () => {
      window.location.href = './index.html';
    });
  }

  if (viewApplicationsBtn) {
    viewApplicationsBtn.addEventListener('click', () => {
      window.location.href = '../applications/index.html';
    });
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
  e.preventDefault();

  // Validate form
  const moveInDate = document.getElementById('move-in-date').value;
  const message = document.getElementById('message').value;
  const termsCheckbox = document.getElementById('terms-checkbox');

  if (!moveInDate) {
    alert('Please select a move-in date');
    return;
  }

  if (!termsCheckbox.checked) {
    alert('Please agree to the terms and conditions');
    return;
  }

  // Get user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Get the selected room details to extract room_id
  const selectedRoomTypeInput = document.querySelector('input[name="room-type"]:checked');

  if (!selectedRoomTypeInput) {
    alert('Please select a room type');
    return;
  }

  const roomId = parseInt(selectedRoomTypeInput.dataset.roomId);

  if (!roomId) {
    alert('Unable to identify the selected room. Please try again.');
    return;
  }

  // Get landlord_id from property data
  const landlordId = state.propertyData?.landlord?.id;

  if (!landlordId) {
    alert('Unable to identify property owner. Please try again.');
    console.error('Missing landlord_id in property data:', state.propertyData);
    return;
  }

  // Prepare application data matching backend expectations
  const applicationData = {
    room_id: roomId,
    landlord_id: landlordId,
    property_id: state.propertyId,
    message:
      message ||
      `Application for ${selectedRoomTypeInput?.value || 'room'}. Move-in date: ${moveInDate}.`,
  };

  // Show loading state
  const submitBtn = document.getElementById('submit-btn');
  const originalContent = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span data-icon="spinner" data-icon-width="20" data-icon-height="20"></span>
    Submitting...
  `;

  try {
    // Submit application to API using correct endpoint
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(applicationData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Update boarder status
      updateBoarderStatus('applied_pending');

      // Show success modal
      showSuccessModal();
    } else {
      throw new Error(result.error || 'Failed to submit application');
    }
  } catch (error) {
    console.error('Error submitting application:', error);

    // For development, simulate success
    if (CONFIG.API_BASE_URL.includes('localhost')) {
      console.log('Development mode: Simulating successful submission');
      updateBoarderStatus('applied_pending');
      showSuccessModal();
    } else {
      alert('Failed to submit application. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }
  }
}

/**
 * Show success modal
 */
function showSuccessModal() {
  const successModal = document.getElementById('success-modal');
  if (successModal) {
    successModal.style.display = 'flex';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
}

// Initialize when module is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConfirmApplication);
} else {
  initConfirmApplication();
}
