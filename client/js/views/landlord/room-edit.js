/**
 * room-edit.js
 * Manages rooms for a single property.
 * Reads ?propertyId=X from the URL and makes real API calls to:
 *   GET    /api/landlord/rooms?propertyId=X   – load property + rooms
 *   POST   /api/landlord/rooms                – create room
 *   PUT    /api/landlord/rooms?id=Y           – update room
 *   DELETE /api/landlord/rooms?id=Y           – delete room
 *   POST   /api/landlord/rooms/{id}/photos    – upload room photos
 *   PATCH  /api/landlord/rooms/{id}/photos    – set cover photo
 *   DELETE /api/landlord/rooms/{id}/photos    – delete a photo
 */

import CONFIG from '../../config.js';
import { showToast } from '../../shared/toast.js';
import { getIcon } from '../../shared/icons.js';
import { initLandlordPermissions } from '../../shared/permissions.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
let propertyId = null;
let propertyData = null;
let allRooms = [];
let editingRoomId = null; // null = creating new room

// Photo state for the modal
// Each entry: { file: File|null, previewUrl: string, photoId: number|null, isCover: bool, toDelete: bool }
let pendingPhotos = [];

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  propertyId = params.get('propertyId') ? parseInt(params.get('propertyId')) : null;

  if (!propertyId) {
    showToast('No property selected. Redirecting…', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }

  loadPropertyAndRooms();
  bindUI();
  bindPhotoUI();
  initLandlordPermissions();
});

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */
function authHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: authHeaders(),
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

/* ------------------------------------------------------------------ */
/* Load data                                                           */
/* ------------------------------------------------------------------ */
async function loadPropertyAndRooms() {
  showLoading(true);

  try {
    const result = await apiFetch(
      `${CONFIG.API_BASE_URL}/api/landlord/rooms?propertyId=${propertyId}`
    );

    propertyData = result.data.property;
    allRooms = result.data.rooms || [];

    renderPropertyInfo(propertyData);
    renderRooms(allRooms);
  } catch (err) {
    console.error('Failed to load rooms:', err);
    showToast(`Failed to load rooms: ${err.message}`, 'error');
    showEmptyState(true);
  } finally {
    showLoading(false);
  }
}

/* ------------------------------------------------------------------ */
/* Render – property info banner                                       */
/* ------------------------------------------------------------------ */
function renderPropertyInfo(prop) {
  if (!prop) return;

  setText('page-title', `Manage Rooms – ${prop.name}`);
  setText('page-description', `Add, edit, and manage rooms for ${prop.name}.`);
  setText('property-name', prop.name);
  setText('property-type', prop.status ?? '—');

  const total = prop.total_rooms ?? 0;
  const occupied = prop.occupied_rooms ?? 0;
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  setText('property-total-rooms', total);
  setText('property-occupied-rooms', occupied);
  setText('property-occupancy-rate', `${rate}%`);

  // location / type come from the full property fetch if available
  setText('property-location', prop.address ?? '—');
}

/* ------------------------------------------------------------------ */
/* Render – rooms grid                                                 */
/* ------------------------------------------------------------------ */
function renderRooms(rooms) {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!rooms.length) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);
  rooms.forEach(room => grid.appendChild(buildRoomCard(room)));
}

function buildRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.dataset.roomId = room.id;

  const statusClass =
    {
      available: 'available',
      occupied: 'occupied',
    }[room.status] ?? 'available';

  const statusLabel =
    {
      available: 'Available',
      occupied: 'Occupied',
    }[room.status] ?? room.status;

  const tenantHtml = room.tenant
    ? `<div class="tenant-info">
         <p class="tenant-name">${escHtml(room.tenant.name)}</p>
         ${room.tenant.phone ? `<p class="tenant-contact">${escHtml(room.tenant.phone)}</p>` : ''}
       </div>`
    : '';

  // Use cover_photo if available, otherwise use placeholder
  let imageUrl = room.cover_photo || '../../../assets/images/placeholder-room.svg';
  // Prefix server photos with API base URL if they're relative paths
  if (
    room.cover_photo &&
    !room.cover_photo.startsWith('http') &&
    !room.cover_photo.startsWith('../')
  ) {
    imageUrl = `${CONFIG.API_BASE_URL}${room.cover_photo}`;
  }
  const imageStyle = room.cover_photo
    ? `background-image: url('${escHtml(
        imageUrl
      )}'); background-size: cover; background-position: center;`
    : `background-image: url('${imageUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; background-color: var(--bg-secondary);`;

  card.innerHTML = `
    <div class="room-card-image" style="${imageStyle}">
      <span class="room-status ${statusClass}">${statusLabel}</span>
    </div>
    <div class="room-card-body">
      <div class="room-card-header">
        <h3 class="room-number">Room ${escHtml(room.room_number)}</h3>
        <span class="room-price">₱${Number(room.price).toLocaleString()}/mo</span>
      </div>
      <div class="room-details">
        <div class="room-detail">
          ${getIcon('users', { width: 16, height: 16, strokeWidth: '2' })}
          Capacity: ${room.capacity}
        </div>
        ${
          room.size
            ? `<div class="room-detail">
          ${getIcon('home', { width: 16, height: 16, strokeWidth: '2' })}
          ${room.size} sqm
        </div>`
            : ''
        }
        ${
          room.deposit > 0
            ? `<div class="room-detail room-detail--deposit">
          ${getIcon('currencyDollar', { width: 16, height: 16, strokeWidth: '2' })}
          Deposit: ₱${Number(room.deposit).toLocaleString()}
        </div>`
            : ''
        }
      </div>
      ${tenantHtml}
      ${
        room.description
          ? `<p style="font-size:0.8rem;color:var(--text-gray);margin-top:0.5rem;">${escHtml(
              room.description
            )}</p>`
          : ''
      }
      <div class="room-actions">
        <button type="button" data-action="edit"   data-id="${room.id}">
          ${getIcon('edit', { width: 16, height: 16, strokeWidth: '2' })} Edit
        </button>
        <button type="button" data-action="delete" data-id="${room.id}" class="btn-danger">
          ${getIcon('trash', { width: 16, height: 16, strokeWidth: '2' })} Delete
        </button>
      </div>
    </div>
  `;

  card.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === 'edit') openEditModal(id);
      if (btn.dataset.action === 'delete') openDeleteModal(id);
    });
  });

  return card;
}

/* ------------------------------------------------------------------ */
/* Modal – add / edit room                                             */
/* ------------------------------------------------------------------ */
function openAddModal() {
  editingRoomId = null;
  setText('modal-title', 'Add New Room');
  document.getElementById('room-form').reset();
  hideTenantSection();
  resetPhotoUI();
  openModal('room-modal');
}

function openEditModal(roomId) {
  const room = allRooms.find(r => r.id === roomId);
  if (!room) return;

  editingRoomId = roomId;
  setText('modal-title', `Edit Room ${room.room_number}`);

  setVal('room-number', room.room_number);
  setVal('room-price', room.price);
  setVal('room-deposit', room.deposit ?? 0);
  setVal('room-size', room.size ?? '');
  setVal('room-capacity', room.capacity);
  setVal('room-status', room.status);
  setVal('room-description', room.description ?? '');

  if (room.tenant) {
    showTenantSection();
    setVal('tenant-name', room.tenant.name ?? '');
    setVal('tenant-contact', room.tenant.phone ?? '');
    setVal('tenancy-start', room.tenant.tenancy_start ?? '');
    setVal('tenancy-end', room.tenant.tenancy_end ?? '');
  } else {
    hideTenantSection();
  }

  // Load existing photos into the photo UI
  resetPhotoUI();
  if (room.photos && room.photos.length > 0) {
    room.photos.forEach(p => {
      pendingPhotos.push({
        file: null,
        previewUrl: p.photo_url,
        photoId: p.id,
        isCover: p.is_cover,
        toDelete: false,
      });
    });
    renderPhotoPreviews();
  }

  openModal('room-modal');
}

async function saveRoom() {
  const saveBtn = document.getElementById('modal-save');
  const form = document.getElementById('room-form');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    property_id: propertyId,
    room_number: getVal('room-number'),
    price: parseFloat(getVal('room-price')),
    deposit: getVal('room-deposit') ? parseFloat(getVal('room-deposit')) : 0,
    size: getVal('room-size') ? parseFloat(getVal('room-size')) : null,
    capacity: getVal('room-capacity') ? parseInt(getVal('room-capacity')) : 1,
    status: getVal('room-status'),
    description: getVal('room-description'),
  };

  saveBtn.disabled = true;
  saveBtn.textContent = editingRoomId ? 'Saving…' : 'Creating…';

  try {
    let result;
    let savedRoomId;

    if (editingRoomId) {
      result = await apiFetch(`${CONFIG.API_BASE_URL}/api/landlord/rooms?id=${editingRoomId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, id: editingRoomId }),
      });
      savedRoomId = editingRoomId;
      const idx = allRooms.findIndex(r => r.id === editingRoomId);
      if (idx !== -1) allRooms[idx] = result.data;
      showToast('Room updated successfully', 'success');
    } else {
      result = await apiFetch(`${CONFIG.API_BASE_URL}/api/landlord/rooms`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      savedRoomId = result.data.id;
      allRooms.push(result.data);
      showToast('Room created successfully', 'success');
    }

    // Handle photo operations
    await syncPhotos(savedRoomId);

    // Reload the room to get updated photos
    try {
      const refreshed = await apiFetch(
        `${CONFIG.API_BASE_URL}/api/landlord/rooms?propertyId=${propertyId}&id=${savedRoomId}`
      );
      const idx = allRooms.findIndex(r => r.id === savedRoomId);
      if (idx !== -1) allRooms[idx] = refreshed.data;
    } catch (_) {
      // Non-critical – grid will still update from local state
    }

    closeModal('room-modal');
    applyFilters();
    refreshPropertyCounts();
  } catch (err) {
    console.error('Save room error:', err);
    showToast(`Failed to save room: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `${getIcon('check', {
      width: 20,
      height: 20,
      strokeWidth: '2',
    })} Save Room`;
  }
}

/**
 * Sync pending photo changes to the server:
 * 1. Delete photos marked for removal
 * 2. Upload new files
 * 3. Apply cover change if needed
 */
async function syncPhotos(roomId) {
  const token = localStorage.getItem('token');
  const baseUrl = `${CONFIG.API_BASE_URL}/api/landlord/rooms/${roomId}/photos`;

  // 1. Delete removed photos
  const toDelete = pendingPhotos.filter(p => p.toDelete && p.photoId);
  for (const p of toDelete) {
    try {
      await fetch(baseUrl, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ photo_id: p.photoId }),
      });
    } catch (e) {
      console.warn('Failed to delete photo', p.photoId, e);
    }
  }

  // 2. Upload new files
  const newFiles = pendingPhotos.filter(p => p.file && !p.toDelete);
  if (newFiles.length > 0) {
    const formData = new FormData();
    newFiles.forEach(p => formData.append('roomPhotos[]', p.file));

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          `Photo upload warning: ${json.error || 'Some photos may not have saved'}`,
          'warning'
        );
      }
    } catch (e) {
      console.warn('Photo upload failed', e);
      showToast('Photos could not be uploaded', 'warning');
    }
  }

  // 3. Set cover if a new cover was chosen (existing photo, not a new upload)
  const coverEntry = pendingPhotos.find(p => p.isCover && p.photoId && !p.toDelete && !p.file);
  if (coverEntry) {
    try {
      await fetch(baseUrl, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ photo_id: coverEntry.photoId }),
      });
    } catch (e) {
      console.warn('Failed to set cover photo', e);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Modal – delete confirmation                                         */
/* ------------------------------------------------------------------ */
let pendingDeleteId = null;

function openDeleteModal(roomId) {
  const room = allRooms.find(r => r.id === roomId);
  if (!room) return;

  pendingDeleteId = roomId;
  setText('delete-room-name', `Room ${room.room_number}`);
  openModal('delete-room-modal');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  const confirmBtn = document.getElementById('delete-confirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting…';

  try {
    await apiFetch(`${CONFIG.API_BASE_URL}/api/landlord/rooms?id=${pendingDeleteId}`, {
      method: 'DELETE',
    });

    allRooms = allRooms.filter(r => r.id !== pendingDeleteId);
    showToast('Room deleted successfully', 'success');
    closeModal('delete-room-modal');
    applyFilters();
    refreshPropertyCounts();
  } catch (err) {
    console.error('Delete room error:', err);
    showToast(`Failed to delete room: ${err.message}`, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete Room';
    pendingDeleteId = null;
  }
}

/* ------------------------------------------------------------------ */
/* Search / filter / sort                                              */
/* ------------------------------------------------------------------ */
function applyFilters() {
  const query = (document.getElementById('search-rooms')?.value ?? '').toLowerCase().trim();
  const status = document.getElementById('filter-status')?.value ?? 'all';
  const sort = document.getElementById('sort-rooms')?.value ?? 'room-number';

  const filtered = allRooms.filter(room => {
    const matchSearch =
      !query ||
      room.room_number.toLowerCase().includes(query) ||
      (room.tenant?.name ?? '').toLowerCase().includes(query);
    const matchStatus = status === 'all' || room.status === status;
    return matchSearch && matchStatus;
  });

  filtered.sort((a, b) => {
    switch (sort) {
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    }
  });

  renderRooms(filtered);
}

/* ------------------------------------------------------------------ */
/* Bind all UI events                                                  */
/* ------------------------------------------------------------------ */
function bindUI() {
  // Add room buttons
  ['add-room-btn', 'floating-add-room', 'empty-state-add-room'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openAddModal);
  });

  // Save room
  document.getElementById('modal-save')?.addEventListener('click', saveRoom);

  // Delete confirm
  document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);

  // Close modals
  document.getElementById('modal-close')?.addEventListener('click', () => {
    resetPhotoUI();
    closeModal('room-modal');
  });
  document.getElementById('modal-cancel')?.addEventListener('click', () => {
    resetPhotoUI();
    closeModal('room-modal');
  });
  document
    .getElementById('delete-modal-close')
    ?.addEventListener('click', () => closeModal('delete-room-modal'));
  document
    .getElementById('delete-cancel')
    ?.addEventListener('click', () => closeModal('delete-room-modal'));

  // Close on backdrop click (clicking the overlay itself, not the modal content)
  ['room-modal', 'delete-room-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target === document.getElementById(id)) {
        if (id === 'room-modal') resetPhotoUI();
        closeModal(id);
      }
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      resetPhotoUI();
      closeModal('room-modal');
      closeModal('delete-room-modal');
    }
  });

  // Show/hide tenant section when status changes
  document.getElementById('room-status')?.addEventListener('change', e => {
    e.target.value === 'occupied' ? showTenantSection() : hideTenantSection();
  });

  // Search / filter / sort
  document.getElementById('search-rooms')?.addEventListener('input', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('sort-rooms')?.addEventListener('change', applyFilters);
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function showLoading(show) {
  const el = document.getElementById('rooms-loading-state');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showEmptyState(show) {
  const el = document.getElementById('rooms-empty-state');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showTenantSection() {
  const el = document.getElementById('tenant-section');
  if (el) el.style.display = 'block';
}

function hideTenantSection() {
  const el = document.getElementById('tenant-section');
  if (el) el.style.display = 'none';
}

function refreshPropertyCounts() {
  const total = allRooms.length;
  const occupied = allRooms.filter(r => r.status === 'occupied').length;
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  setText('property-total-rooms', total);
  setText('property-occupied-rooms', occupied);
  setText('property-occupancy-rate', `${rate}%`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function getVal(id) {
  return document.getElementById(id)?.value ?? '';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/* Photo UI                                                            */
/* ------------------------------------------------------------------ */

function bindPhotoUI() {
  const input = document.getElementById('room-photos-input');
  const placeholder = document.getElementById('photo-upload-placeholder');
  const addMoreBtn = document.getElementById('photo-add-more-btn');
  const uploadArea = document.getElementById('photo-upload-area');

  // Click on placeholder opens file picker
  placeholder?.addEventListener('click', () => input?.click());

  // "Add more" button
  addMoreBtn?.addEventListener('click', () => input?.click());

  // File input change
  input?.addEventListener('change', e => {
    addFilesToPending(Array.from(e.target.files));
    e.target.value = ''; // reset so same file can be re-added
  });

  // Drag & drop
  uploadArea?.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea?.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFilesToPending(files);
  });
}

function addFilesToPending(files) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;
  let skipped = 0;

  files.forEach(file => {
    if (!allowed.includes(file.type)) {
      skipped++;
      return;
    }
    if (file.size > maxSize) {
      skipped++;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const isFirstEver = pendingPhotos.filter(p => !p.toDelete).length === 0;
    pendingPhotos.push({
      file,
      previewUrl,
      photoId: null,
      isCover: isFirstEver,
      toDelete: false,
    });
  });

  if (skipped > 0) {
    setHint(`${skipped} file(s) skipped (unsupported type or > 5 MB)`, 'error');
  } else {
    setHint('');
  }

  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const grid = document.getElementById('photo-preview-grid');
  const placeholder = document.getElementById('photo-upload-placeholder');
  const addMoreBtn = document.getElementById('photo-add-more-btn');

  if (!grid) return;

  const visible = pendingPhotos.filter(p => !p.toDelete);

  grid.innerHTML = '';

  if (visible.length === 0) {
    placeholder && (placeholder.style.display = 'flex');
    addMoreBtn && (addMoreBtn.style.display = 'none');
    return;
  }

  placeholder && (placeholder.style.display = 'none');
  addMoreBtn && (addMoreBtn.style.display = 'block');

  visible.forEach((entry, visIdx) => {
    const realIdx = pendingPhotos.indexOf(entry);

    const item = document.createElement('div');
    item.className = 'photo-preview-item' + (entry.isCover ? ' is-cover' : '');

    const img = document.createElement('img');
    // For existing server photos, prefix with API base if relative
    img.src = entry.file
      ? entry.previewUrl
      : entry.previewUrl.startsWith('http')
      ? entry.previewUrl
      : `${CONFIG.API_BASE_URL}${entry.previewUrl}`;
    img.alt = `Room photo ${visIdx + 1}`;
    item.appendChild(img);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'photo-remove-btn';
    removeBtn.title = 'Remove photo';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removePhoto(realIdx));
    item.appendChild(removeBtn);

    if (entry.isCover) {
      const badge = document.createElement('span');
      badge.className = 'photo-cover-badge';
      badge.textContent = 'Cover';
      item.appendChild(badge);
    } else {
      const setCoverBtn = document.createElement('button');
      setCoverBtn.type = 'button';
      setCoverBtn.className = 'photo-set-cover-btn';
      setCoverBtn.textContent = 'Set cover';
      setCoverBtn.addEventListener('click', () => setCover(realIdx));
      item.appendChild(setCoverBtn);
    }

    grid.appendChild(item);
  });
}

function removePhoto(idx) {
  const entry = pendingPhotos[idx];
  if (!entry) return;

  if (entry.photoId) {
    // Existing server photo – mark for deletion
    entry.toDelete = true;
    // If it was the cover, promote the next visible photo
    if (entry.isCover) {
      const next = pendingPhotos.find(p => !p.toDelete && p !== entry);
      if (next) next.isCover = true;
    }
  } else {
    // New file – just remove from array and revoke object URL
    URL.revokeObjectURL(entry.previewUrl);
    pendingPhotos.splice(idx, 1);
    // Ensure at least one cover among remaining
    const remaining = pendingPhotos.filter(p => !p.toDelete);
    if (remaining.length > 0 && !remaining.some(p => p.isCover)) {
      remaining[0].isCover = true;
    }
  }

  renderPhotoPreviews();
}

function setCover(idx) {
  pendingPhotos.forEach((p, i) => {
    p.isCover = i === idx;
  });
  renderPhotoPreviews();
}

function resetPhotoUI() {
  // Revoke any object URLs for new files
  pendingPhotos.forEach(p => {
    if (p.file) URL.revokeObjectURL(p.previewUrl);
  });
  pendingPhotos = [];

  const grid = document.getElementById('photo-preview-grid');
  const placeholder = document.getElementById('photo-upload-placeholder');
  const addMoreBtn = document.getElementById('photo-add-more-btn');

  if (grid) grid.innerHTML = '';
  if (placeholder) placeholder.style.display = 'flex';
  if (addMoreBtn) addMoreBtn.style.display = 'none';

  setHint('');
}

function setHint(msg, type = '') {
  const el = document.getElementById('photo-upload-hint');
  if (!el) return;
  el.textContent = msg;
  el.className = 'photo-upload-hint' + (type ? ` ${type}` : '');
  el.style.display = msg ? 'block' : 'none';
}
