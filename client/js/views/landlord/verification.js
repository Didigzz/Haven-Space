import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { showToast } from '../../shared/toast.js';

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
  iconElements.forEach(element => {
    const iconName = element.dataset.icon;
    const options = {
      width: element.dataset.iconWidth || 24,
      height: element.dataset.iconHeight || 24,
      strokeWidth: element.dataset.iconStrokeWidth || '1.5',
      className: element.dataset.iconClass || '',
    };
    element.innerHTML = getIcon(iconName, options);
  });
}

/**
 * Document types configuration
 */
const DOCUMENT_TYPES = {
  government_id_front: {
    title: 'Government ID (Front)',
    description: 'Front side of your government-issued ID',
    required: true,
  },
  government_id_back: {
    title: 'Government ID (Back)',
    description: 'Back side of your government-issued ID',
    required: true,
  },
  selfie_with_id: {
    title: 'Selfie with ID',
    description: 'Photo of yourself holding your ID',
    required: true,
  },
  business_registration: {
    title: 'Business Registration',
    description: 'Business registration certificate',
    required: false,
  },
  tax_id: {
    title: 'Tax ID Documents',
    description: 'Tax identification documents',
    required: false,
  },
  property_title: {
    title: 'Property Title',
    description: 'Property ownership documents',
    required: false,
  },
  tax_declaration: {
    title: 'Tax Declaration',
    description: 'Property tax declaration',
    required: false,
  },
  business_permit: {
    title: 'Business Permit',
    description: 'Barangay business permit',
    required: false,
  },
};

/**
 * Verification state management
 */
let verificationState = {
  emailVerified: false,
  accountStatus: 'pending_verification',
  verificationStatus: 'pending',
  documents: [],
  requiredDocsComplete: false,
};

/**
 * Load verification status from API
 */
async function loadVerificationStatus() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/verification-status.php`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load verification status');
    }

    const result = await response.json();

    if (result.success) {
      verificationState = { ...verificationState, ...result };
      updateUI();
    } else {
      throw new Error(result.error || 'Failed to load verification status');
    }
  } catch (error) {
    console.error('Error loading verification status:', error);
    showToast('Failed to load verification status', 'error');
  }
}

/**
 * Update UI based on verification state
 */
function updateUI() {
  updateStatusCard();
  updateSteps();
  updateDocumentGrid();

  // Show verification notes if any
  if (verificationState.verificationNotes || verificationState.profileVerificationNotes) {
    const notesContainer = document.getElementById('verificationNotes');
    const notesContent = document.getElementById('notesContent');

    const notes = verificationState.verificationNotes || verificationState.profileVerificationNotes;
    notesContent.textContent = notes;
    notesContainer.style.display = 'block';
  }
}

/**
 * Update status card
 */
function updateStatusCard() {
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  let progress = 0;
  let iconName = 'clock';
  let iconClass = 'pending';
  let title = 'Verification in Progress';
  let message = 'Please complete all verification steps below.';

  // Calculate progress
  if (verificationState.emailVerified) progress += 33;
  if (verificationState.requiredDocsComplete) progress += 33;
  if (verificationState.verificationStatus === 'approved') progress += 34;

  // Update based on status
  if (verificationState.verificationStatus === 'approved') {
    iconName = 'checkCircle';
    iconClass = 'approved';
    title = 'Verification Complete';
    message = 'Your account has been verified! You can now start listing properties.';
  } else if (verificationState.verificationStatus === 'rejected') {
    iconName = 'exclamationCircle';
    iconClass = 'rejected';
    title = 'Verification Rejected';
    message = 'Your verification was rejected. Please review the notes below and resubmit.';
  } else if (verificationState.requiredDocsComplete) {
    title = 'Under Review';
    message = 'Your documents are being reviewed by our team. This usually takes 24-48 hours.';
  }

  // Update DOM
  statusIcon.className = `status-icon ${iconClass}`;
  statusIcon.innerHTML = getIcon(iconName, { width: 32, height: 32 });
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${progress}% Complete`;
}

/**
 * Update verification steps
 */
function updateSteps() {
  // Email step
  const emailStep = document.getElementById('emailStep');
  const emailStatus = document.getElementById('emailStatus');
  const emailBody = document.getElementById('emailBody');

  if (verificationState.emailVerified) {
    emailStep.classList.add('completed');
    emailStep.classList.remove('active');
    emailStatus.innerHTML = getIcon('checkCircle', { width: 20, height: 20 });
    emailBody.innerHTML = '<p class="step-success">✅ Email verified successfully</p>';
  } else {
    emailStep.classList.add('active');
    emailStep.classList.remove('completed');
    emailStatus.innerHTML = getIcon('clock', { width: 20, height: 20 });
  }

  // Document step
  const documentStep = document.getElementById('documentStep');
  const documentStatus = document.getElementById('documentStatus');

  if (verificationState.requiredDocsComplete) {
    documentStep.classList.add('completed');
    documentStep.classList.remove('active');
    documentStatus.innerHTML = getIcon('checkCircle', { width: 20, height: 20 });
  } else if (verificationState.emailVerified) {
    documentStep.classList.add('active');
    documentStep.classList.remove('disabled');
    documentStatus.innerHTML = getIcon('clock', { width: 20, height: 20 });
  } else {
    documentStep.classList.add('disabled');
    documentStatus.innerHTML = getIcon('lock', { width: 20, height: 20 });
  }

  // Review step
  const reviewStep = document.getElementById('reviewStep');
  const reviewStatus = document.getElementById('reviewStatus');

  if (verificationState.verificationStatus === 'approved') {
    reviewStep.classList.add('completed');
    reviewStep.classList.remove('active');
    reviewStatus.innerHTML = getIcon('checkCircle', { width: 20, height: 20 });
  } else if (verificationState.requiredDocsComplete) {
    reviewStep.classList.add('active');
    reviewStep.classList.remove('disabled');
    reviewStatus.innerHTML = getIcon('clock', { width: 20, height: 20 });
  } else {
    reviewStep.classList.add('disabled');
    reviewStatus.innerHTML = getIcon('lock', { width: 20, height: 20 });
  }
}

/**
 * Update document upload grid
 */
function updateDocumentGrid() {
  const uploadGrid = document.getElementById('uploadGrid');
  uploadGrid.innerHTML = '';

  Object.entries(DOCUMENT_TYPES).forEach(([type, config]) => {
    const uploadedDoc = verificationState.documents.find(doc => doc.document_type === type);

    const uploadItem = document.createElement('div');
    uploadItem.className = 'upload-item';
    uploadItem.dataset.documentType = type;

    let iconName = 'cloudArrowUp';
    let statusText = config.required ? 'Required' : 'Optional';

    if (uploadedDoc) {
      if (uploadedDoc.upload_status === 'verified') {
        uploadItem.classList.add('uploaded');
        iconName = 'checkCircle';
        statusText = 'Verified';
      } else if (uploadedDoc.upload_status === 'rejected') {
        uploadItem.classList.add('rejected');
        iconName = 'exclamationCircle';
        statusText = 'Rejected';
      } else {
        uploadItem.classList.add('uploaded');
        iconName = 'clock';
        statusText = 'Under Review';
      }
    }

    uploadItem.innerHTML = `
      <div class="upload-item-icon">
        ${getIcon(iconName, { width: 24, height: 24 })}
      </div>
      <h4 class="upload-item-title">${config.title}</h4>
      <p class="upload-item-status">${statusText}</p>
    `;

    // Add click handler for upload
    if (!uploadedDoc || uploadedDoc.upload_status === 'rejected') {
      uploadItem.addEventListener('click', () => openUploadModal(type, config.title));
    }

    uploadGrid.appendChild(uploadItem);
  });
}

/**
 * Open upload modal
 */
function openUploadModal(documentType, documentTitle) {
  const modal = document.getElementById('uploadModal');
  const modalTitle = document.getElementById('uploadModalTitle');
  const documentTypeInput = document.getElementById('documentType');

  modalTitle.textContent = `Upload ${documentTitle}`;
  documentTypeInput.value = documentType;

  modal.classList.add('active');
}

/**
 * Close upload modal
 */
function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  const form = document.getElementById('uploadForm');

  modal.classList.remove('active');
  form.reset();
}

/**
 * Upload document
 */
async function uploadDocument(formData) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/landlord/upload-verification-document.php`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      showToast('Document uploaded successfully!', 'success');
      closeUploadModal();

      // Reload verification status
      await loadVerificationStatus();
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast(error.message || 'Failed to upload document', 'error');
  }
}

/**
 * Resend verification email
 */
async function resendVerificationEmail() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/resend-verification.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showToast('Verification email sent! Please check your inbox.', 'success');
    } else {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error) {
    console.error('Resend email error:', error);
    showToast(error.message || 'Failed to send verification email', 'error');
  }
}

/**
 * Initialize verification page
 */
document.addEventListener('DOMContentLoaded', async function () {
  // Inject icons
  injectIcons();

  // Load verification status
  await loadVerificationStatus();

  // Setup event listeners

  // Resend email button
  document.getElementById('resendEmailBtn').addEventListener('click', resendVerificationEmail);

  // Upload modal controls
  document.getElementById('uploadModalClose').addEventListener('click', closeUploadModal);
  document.getElementById('uploadCancelBtn').addEventListener('click', closeUploadModal);

  // Upload form submission
  document.getElementById('uploadForm').addEventListener('submit', async e => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const submitBtn = document.getElementById('uploadSubmitBtn');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      await uploadDocument(formData);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // File input change handler
  document.getElementById('documentFile').addEventListener('change', e => {
    const file = e.target.files[0];
    const placeholder = document.querySelector('.upload-placeholder');

    if (file) {
      placeholder.innerHTML = `
        <span data-icon="document" data-icon-width="48" data-icon-height="48"></span>
        <p><strong>${file.name}</strong></p>
        <p class="upload-hint">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
      `;
      injectIcons();
    }
  });

  // Close modal on backdrop click
  document.getElementById('uploadModal').addEventListener('click', e => {
    if (e.target.id === 'uploadModal') {
      closeUploadModal();
    }
  });
});
