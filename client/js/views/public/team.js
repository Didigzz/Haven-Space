document.addEventListener('DOMContentLoaded', () => {
  const teamGrid = document.getElementById('teamGrid');
  if (!teamGrid) return;

  const teamCards = Array.from(teamGrid.querySelectorAll('.team-card'));
  let expandedCard = null;

  function collapseAll() {
    expandedCard = null;
    teamCards.forEach(c => c.classList.remove('expanded', 'collapsed'));
  }

  function expandCard(card) {
    teamCards.forEach(c => {
      if (c === card) {
        c.classList.add('expanded');
        c.classList.remove('collapsed');
      } else {
        c.classList.remove('expanded');
        c.classList.add('collapsed');
      }
    });
    expandedCard = card;
  }

  function collapseCard(card) {
    card.classList.remove('expanded');
    teamCards.forEach(c => c.classList.remove('collapsed'));
    expandedCard = null;
  }

  // Single delegated listener on the grid — no per-card listeners
  teamGrid.addEventListener('click', e => {
    const card = e.target.closest('.team-card');
    if (!card) return;

    // Collapse button
    if (e.target.closest('.collapse-btn')) {
      e.stopPropagation();
      collapseCard(card);
      return;
    }

    if (card.classList.contains('expanded')) {
      collapseCard(card);
    } else {
      expandCard(card);
    }
  });

  // Click outside — collapse
  document.addEventListener('click', e => {
    if (expandedCard && !e.target.closest('.team-card')) {
      collapseAll();
    }
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && expandedCard) {
      collapseAll();
    }
  });
});
