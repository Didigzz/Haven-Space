document.addEventListener('DOMContentLoaded', () => {
  const teamGrid = document.getElementById('teamGrid');
  if (!teamGrid) return;

  const teamCards = Array.from(teamGrid.querySelectorAll('.team-card'));
  let expandedCard = null;
  let isAnimating = false;

  // Pre-warm GPU layers on first interaction
  teamGrid.addEventListener(
    'pointerenter',
    () => {
      teamCards.forEach(c => (c.style.willChange = 'flex'));
    },
    { once: true }
  );

  function collapseAll() {
    expandedCard = null;
    teamCards.forEach(c => {
      c.classList.remove('expanded', 'collapsed');
      c.style.willChange = '';
    });
  }

  function expandCard(card) {
    if (isAnimating) return;
    isAnimating = true;

    // Batch all DOM writes in one rAF to avoid layout thrash
    requestAnimationFrame(() => {
      teamCards.forEach(c => {
        if (c === card) {
          c.classList.add('expanded');
          c.classList.remove('collapsed');
        } else {
          c.classList.remove('expanded');
          c.classList.add('collapsed');
          c.style.willChange = '';
        }
      });
      expandedCard = card;

      // Clear willChange after transition ends to free GPU memory
      card.addEventListener(
        'transitionend',
        () => {
          card.style.willChange = '';
          isAnimating = false;
        },
        { once: true }
      );
    });
  }

  function collapseCard(card) {
    if (isAnimating) return;
    isAnimating = true;

    requestAnimationFrame(() => {
      card.classList.remove('expanded');
      teamCards.forEach(c => c.classList.remove('collapsed'));
      expandedCard = null;

      card.addEventListener(
        'transitionend',
        () => {
          card.style.willChange = '';
          isAnimating = false;
        },
        { once: true }
      );
    });
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
      card.style.willChange = 'flex';
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
