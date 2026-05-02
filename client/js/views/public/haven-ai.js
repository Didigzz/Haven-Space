/**
 * Haven AI – Landing Page Chat Demo
 *
 * Features:
 *  • Multi-turn conversation (history sent to backend each turn)
 *  • Markdown-to-HTML rendering (bold, italic, bullet lists, numbered lists, inline code)
 *  • Quick-prompt chips that the user can click
 *  • Live property-count badge on the chat header
 *  • Graceful error handling with retry option
 */

import AIService from '../../services/AIService.js';

/* ─────────────────────────────────────────────────────────
   Entry point
   ───────────────────────────────────────────────────────── */
export function initHavenAIPage() {
  initSmoothScrolling();
  initNavbarScroll();
  initAIDemo();
}

/* ─────────────────────────────────────────────────────────
   Smooth scrolling
   ───────────────────────────────────────────────────────── */
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────
   Navbar scroll effect
   ───────────────────────────────────────────────────────── */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 50);
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ─────────────────────────────────────────────────────────
   Lightweight markdown → HTML converter
   Supports: **bold**, *italic*, `code`, bullet lists, numbered lists, line breaks
   ───────────────────────────────────────────────────────── */
function markdownToHtml(text) {
  if (!text) return '';

  // Escape HTML first to prevent XSS
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Process bullet lists (lines starting with * or -)
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, match => `<ul>${match}</ul>`);

  // Process numbered lists (lines starting with 1. 2. etc.)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> blocks that aren't already in <ul>
  html = html.replace(/(?<!<\/ul>\n?)(<li>.*?<\/li>(?:\n<li>.*?<\/li>)*)/gs, match => {
    if (match.startsWith('<li>') && !html.includes('<ul>' + match)) {
      return `<ol>${match}</ol>`;
    }
    return match;
  });

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_  (single, not double)
  html = html.replace(/\*(?!\*)(.+?)(?<!\*)\*/g, '<em>$1</em>');
  html = html.replace(/_(?!_)(.+?)(?<!_)_/g, '<em>$1</em>');

  // Inline code: `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Line breaks → <br> (but not inside list items)
  html = html.replace(/\n(?!<\/?(ul|ol|li))/g, '<br>');

  return html;
}

/* ─────────────────────────────────────────────────────────
   AI Demo widget
   ───────────────────────────────────────────────────────── */
function initAIDemo() {
  const demoInput = document.getElementById('demo-user-input');
  const demoSendButton = document.getElementById('demo-send-button');
  const demoChat = document.getElementById('demo-chat');

  if (!demoInput || !demoSendButton || !demoChat) {
    console.warn('[Haven AI] Chat elements not found');
    return;
  }

  /* --- Conversation history (sent to backend for context) --- */
  const conversationHistory = [];

  /* ── DOM helpers ── */

  function scrollToBottom() {
    demoChat.scrollTop = demoChat.scrollHeight;
  }

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'demo-message demo-user-message';
    div.innerHTML = `
      <div class="demo-message-content">
        <p>${escapeHtml(text)}</p>
      </div>
      <div class="demo-message-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>`;
    demoChat.appendChild(div);
    scrollToBottom();
  }

  function addAIMessage(htmlContent, isError = false) {
    const div = document.createElement('div');
    div.className = 'demo-message demo-ai-message';
    div.innerHTML = `
      <div class="demo-message-avatar demo-ai-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          <path d="M5 3 4 6l-3 1 3 1 1 3 1-3 3-1-3-1-1-3z"/>
          <path d="M19 13 18 16l-3 1 3 1 1 3 1-3 3-1-3-1-1-3z"/>
        </svg>
      </div>
      <div class="demo-message-content${isError ? ' demo-message-error' : ''}">
        <div class="demo-message-md">${htmlContent}</div>
      </div>`;
    demoChat.appendChild(div);
    scrollToBottom();
    return div;
  }

  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'demo-message demo-ai-message demo-typing-message';
    div.innerHTML = `
      <div class="demo-message-avatar demo-ai-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
      </div>
      <div class="demo-message-content">
        <p class="demo-typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </p>
      </div>`;
    demoChat.appendChild(div);
    scrollToBottom();
    return div;
  }

  /** Show clickable quick-prompt chips below a message */
  function addQuickPrompts(prompts) {
    const existing = demoChat.querySelector('.demo-quick-prompts');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'demo-quick-prompts';
    prompts.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'demo-quick-prompt-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        wrapper.remove();
        demoInput.value = text;
        handleSubmit();
      });
      wrapper.appendChild(btn);
    });
    demoChat.appendChild(wrapper);
    scrollToBottom();
  }

  /** Update the property-count badge in the demo header */
  function updatePropertyBadge(count) {
    let badge = document.querySelector('.demo-property-badge');
    if (!badge) return;
    badge.textContent = count > 0 ? `${count} listing${count !== 1 ? 's' : ''} live` : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  /* ── Send message ── */
  async function handleSubmit() {
    const userInput = demoInput.value.trim();
    if (!userInput) return;

    // Lock UI
    demoInput.disabled = true;
    demoSendButton.disabled = true;
    demoInput.value = '';

    // Remove any leftover quick prompts
    const qp = demoChat.querySelector('.demo-quick-prompts');
    if (qp) qp.remove();

    addUserMessage(userInput);

    const typingEl = addTypingIndicator();

    try {
      const response = await AIService.chatWithHistory(userInput, conversationHistory);

      typingEl.remove();

      if (response.success && response.response) {
        const htmlContent = markdownToHtml(response.response);
        addAIMessage(htmlContent);

        // Update conversation history for next turn
        conversationHistory.push({ role: 'user', content: userInput });
        conversationHistory.push({ role: 'assistant', content: response.response });

        // Update listing badge if backend sends property_count
        if (typeof response.property_count === 'number') {
          updatePropertyBadge(response.property_count);
        }

        // Suggest follow-up prompts based on context
        const followUps = getFollowUpPrompts(userInput, response.response);
        if (followUps.length) addQuickPrompts(followUps);
      } else {
        addAIMessage(
          '<em>Sorry, I had trouble connecting to the AI service. Please try again.</em>',
          true
        );
      }
    } catch (err) {
      typingEl.remove();
      addAIMessage(
        '<em>Something went wrong. Please check your connection and try again.</em>',
        true
      );
      console.error('[Haven AI] chat error:', err);
    }

    // Unlock UI
    demoInput.disabled = false;
    demoSendButton.disabled = false;
    demoInput.focus();
  }

  /* ── Follow-up prompt heuristics ── */
  function getFollowUpPrompts(question, answer) {
    const q = question.toLowerCase();
    const a = answer.toLowerCase();

    // After a listing query → offer filters
    if (q.includes('show') || q.includes('list') || q.includes('find') || q.includes('all')) {
      return ['What is the cheapest room?', 'Compare prices', 'Which has WiFi?'];
    }
    // After price question
    if (
      q.includes('price') ||
      q.includes('presyo') ||
      q.includes('cost') ||
      q.includes('how much')
    ) {
      return ['Show all listings', 'Which is the cheapest?', 'Which is near universities?'];
    }
    // After location question
    if (q.includes('near') || q.includes('location') || q.includes('where') || q.includes('city')) {
      return ['Show available rooms', 'What amenities are included?', 'How do I apply?'];
    }
    // After amenity question
    if (q.includes('wifi') || q.includes('amenities') || q.includes('ac') || q.includes('aircon')) {
      return ['Show prices', 'How do I book a viewing?', 'Are rooms still available?'];
    }
    // Default follow-ups
    return ['Show all listings', 'Compare prices', 'How do I sign up?'];
  }

  /* ── Event listeners ── */
  demoSendButton.addEventListener('click', handleSubmit);
  demoInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit();
  });

  /* ── Initial welcome message + quick prompts ── */
  setTimeout(() => {
    addAIMessage(
      markdownToHtml(
        "Hello! I'm **Haven AI** 👋\n\nI'm your smart boarding-house assistant. I have real-time access to Haven Space listings — ask me to find rooms, compare prices, or check what's available near you!"
      )
    );

    // Offer starter prompts
    addQuickPrompts([
      'Show all listings',
      'What are the prices?',
      'Which rooms are available?',
      'How do I apply for a room?',
    ]);
  }, 800);
}

/* ─────────────────────────────────────────────────────────
   Utility: simple HTML escape (used for user text only)
   ───────────────────────────────────────────────────────── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
