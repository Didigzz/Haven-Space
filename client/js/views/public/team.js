// Simplified team.js with basic functionality
// Removed complex animations and debouncing for better performance

document.addEventListener('DOMContentLoaded', () => {
  const teamGrid = document.getElementById('teamGrid');
  if (!teamGrid) return;

  const teamCards = teamGrid.querySelectorAll('.team-card');
  let expandedCard = null;

  // Simple expand/collapse logic
  function expandCard(card) {
    // Collapse any currently expanded card
    if (expandedCard) {
      expandedCard.classList.remove('expanded');
      expandedCard.classList.add('collapsed');
    }

    // Expand the clicked card
    card.classList.add('expanded');
    card.classList.remove('collapsed');
    expandedCard = card;
  }

  function collapseCard(card) {
    card.classList.remove('expanded');
    card.classList.remove('collapsed');
    expandedCard = null;
  }

  function collapseAll() {
    teamCards.forEach(card => {
      card.classList.remove('expanded', 'collapsed');
    });
    expandedCard = null;
  }

  // Click handler for team cards
  teamGrid.addEventListener('click', e => {
    const card = e.target.closest('.team-card');
    if (!card) return;

    // Handle collapse button click
    if (e.target.closest('.collapse-btn')) {
      e.stopPropagation();
      collapseCard(card);
      return;
    }

    // Toggle expand/collapse
    if (card.classList.contains('expanded')) {
      collapseCard(card);
    } else {
      expandCard(card);
    }
  });

  // Click outside to collapse
  document.addEventListener('click', e => {
    if (expandedCard && !e.target.closest('.team-card')) {
      collapseAll();
    }
  });

  // Escape key to collapse
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && expandedCard) {
      collapseAll();
    }
  });
});
