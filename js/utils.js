// ═══════════════════════════════════════════════
// utils.js — shared helpers
// ═══════════════════════════════════════════════

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPercent(score, max) {
  if (!max) return '0%';
  return `${Math.round((score / max) * 100)}%`;
}

export function getRating(score, max) {
  const pct = (score / max) * 100;
  if (pct === 100) return '🏆 Perfect Round!';
  if (pct >= 92)   return '🥇 Excellent';
  if (pct >= 80)   return '🥈 Great';
  if (pct >= 64)   return '🥉 Good';
  if (pct >= 48)   return 'Keep Practicing';
  return 'Just Getting Started';
}

export function disciplineLabel(discipline) {
  return {
    american_trap: 'American Trap',
    skeet:         'Skeet',
    olympic_trap:  'Olympic Trap',
    handicap_trap: 'Handicap Trap',
  }[discipline] || discipline;
}

export function disciplineAccentClass(discipline) {
  return {
    american_trap: 'trap',
    skeet:         'skeet',
    olympic_trap:  'olympic',
    handicap_trap: 'handicap',
  }[discipline] || 'trap';
}

export function disciplineDotColor(discipline) {
  return {
    american_trap: 'var(--accent-trap)',
    skeet:         'var(--accent-skeet)',
    olympic_trap:  'var(--accent-olympic)',
    handicap_trap: 'var(--accent-handicap)',
  }[discipline] || 'var(--accent-trap)';
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Vibration feedback (silently fails if not supported)
export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (_) {}
}

export function confirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    const msg     = document.getElementById('confirm-message');
    const okBtn   = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    msg.textContent = message;
    overlay.classList.remove('hidden');

    const cleanup = () => overlay.classList.add('hidden');

    okBtn.onclick = () => { cleanup(); resolve(true); };
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
  });
}
