/**
 * Notices & Announcements Page Logic
 * Handles filtering, searching, and user interactions
 */

// State management
const noticesState = {
  currentTab: 'all',
  searchQuery: '',
  categoryFilter: 'all',
  priorityFilter: 'all',
};

/**
 * Initialize notices page functionality
 */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSearch();
  initFilters();
  initCardActions();
  initFeaturedActions();
  initLoadMore();
});

/**
 * Initialize tab navigation
 */
function initTabs() {
  const tabs = document.querySelectorAll('.notices-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update state
      noticesState.currentTab = tab.dataset.tab;

      // Filter notices
      filterNotices();
    });
  });
}

/**
 * Initialize search functionality
 */
function initSearch() {
  const searchInput = document.getElementById('notices-search');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      noticesState.searchQuery = e.target.value.toLowerCase().trim();
      filterNotices();
    });
  }
}

/**
 * Initialize filter dropdowns
 */
function initFilters() {
  const categoryFilter = document.getElementById('category-filter');
  const priorityFilter = document.getElementById('priority-filter');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', e => {
      noticesState.categoryFilter = e.target.value;
      filterNotices();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener('change', e => {
      noticesState.priorityFilter = e.target.value;
      filterNotices();
    });
  }
}

/**
 * Filter notices based on current state
 */
function filterNotices() {
  const cards = document.querySelectorAll('.notice-card');

  cards.forEach(card => {
    const category = card.dataset.category;
    const priority = card.dataset.priority;
    const title = card.querySelector('.notice-card-title')?.textContent.toLowerCase() || '';
    const text = card.querySelector('.notice-card-text')?.textContent.toLowerCase() || '';

    // Check tab filter (category-based)
    const matchesTab = noticesState.currentTab === 'all' || noticesState.currentTab === category;

    // Check category dropdown filter
    const matchesCategory =
      noticesState.categoryFilter === 'all' || noticesState.categoryFilter === category;

    // Check priority dropdown filter
    const matchesPriority =
      noticesState.priorityFilter === 'all' || noticesState.priorityFilter === priority;

    // Check search query
    const matchesSearch =
      noticesState.searchQuery === '' ||
      title.includes(noticesState.searchQuery) ||
      text.includes(noticesState.searchQuery);

    // Show/hide based on all filters
    if (matchesTab && matchesCategory && matchesPriority && matchesSearch) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });

  // Update empty state
  updateEmptyState();
}

/**
 * Update empty state visibility
 */
function updateEmptyState() {
  const cards = document.querySelectorAll('.notice-card:not(.hidden)');
  const grid = document.getElementById('notices-grid');

  if (cards.length === 0) {
    // Show empty state if no cards match filters
    let emptyState = grid.querySelector('.notices-empty');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'notices-empty show';
      emptyState.innerHTML = `
        <svg class="notices-empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <h3 class="notices-empty-title">No notices found</h3>
        <p class="notices-empty-text">Try adjusting your filters or search query</p>
      `;
      grid.appendChild(emptyState);
    } else {
      emptyState.classList.add('show');
    }
  } else {
    // Hide empty state
    const emptyState = grid.querySelector('.notices-empty');
    if (emptyState) {
      emptyState.classList.remove('show');
    }
  }
}

/**
 * Initialize card action buttons
 */
function initCardActions() {
  const cardActions = document.querySelectorAll('.notice-card-action');

  cardActions.forEach(button => {
    button.addEventListener('click', e => {
      e.stopPropagation(); // Prevent card click
      const card = button.closest('.notice-card');
      const title = card.querySelector('.notice-card-title')?.textContent || 'Notice';

      // Show notice details (placeholder for modal)
      console.log('Opening notice:', title);
      // TODO: Implement modal or navigate to detail view
    });
  });

  // Add click handlers to cards themselves
  const cards = document.querySelectorAll('.notice-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.notice-card-title')?.textContent || 'Notice';
      console.log('Opening notice:', title);
      // TODO: Implement modal or navigate to detail view
    });
  });
}

/**
 * Initialize featured notice actions
 */
function initFeaturedActions() {
  const featuredCard = document.querySelector('.notices-featured-card');
  if (!featuredCard) return;

  const acknowledgeBtn = featuredCard.querySelector('[data-action="acknowledge"]');
  const dismissBtn = featuredCard.querySelector('[data-action="dismiss"]');

  if (acknowledgeBtn) {
    acknowledgeBtn.addEventListener('click', () => {
      // Mark as acknowledged
      console.log('Notice acknowledged');
      // Visual feedback
      acknowledgeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Acknowledged
      `;
      acknowledgeBtn.disabled = true;
      acknowledgeBtn.style.opacity = '0.7';
      acknowledgeBtn.style.cursor = 'not-allowed';
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      // Dismiss notice
      console.log('Notice dismissed');
      featuredCard.style.transition = 'all 0.3s ease';
      featuredCard.style.opacity = '0';
      featuredCard.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        featuredCard.style.display = 'none';
      }, 300);
    });
  }
}

/**
 * Initialize load more functionality
 */
function initLoadMore() {
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      console.log('Loading more notices...');
      // TODO: Implement pagination or infinite scroll
      // Placeholder: Add loading state
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="animation: spin 1s linear infinite;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Loading...
      `;

      // Simulate loading (remove in production)
      setTimeout(() => {
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = `
          Load More Notices
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        `;
      }, 1500);
    });
  }
}

// Add spin animation for loading icon
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
