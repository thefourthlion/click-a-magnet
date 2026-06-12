import type { Message, MessageResponse, ToastKind } from '@/utils/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Capture phase so we beat the page's own click handlers.
    document.addEventListener('click', onClick, true);

    // Toasts requested by the background (context menu flow).
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.type === 'SHOW_TOAST') showToast(message.text, message.kind);
    });
  },
});

function onClick(event: MouseEvent) {
  const target = event.target as Element | null;
  const anchor = target?.closest?.('a[href^="magnet:"]') as HTMLAnchorElement | null;
  if (!anchor) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  showToast('Sending to downloader…', 'info');

  browser.runtime
    .sendMessage({ type: 'ADD_MAGNET', magnet: anchor.href })
    .then((res: MessageResponse) => {
      if (res?.ok) showToast(`Added to ${res.data ?? 'your downloader'}`, 'success');
      else showToast(res?.error ?? 'Failed to add torrent.', 'error');
    })
    .catch(() => showToast('Could not reach the extension. Try reloading the page.', 'error'));
}

// Pastel hacker-pirate palette (matches assets/theme.css).
const TOAST_ACCENTS: Record<ToastKind, string> = {
  info: '#b4befe',
  success: '#a6e3a1',
  error: '#f38ba8',
};

function showToast(text: string, kind: ToastKind) {
  // Replace any existing toast so they don't stack up.
  document.getElementById('click-a-magnet-toast')?.remove();

  const accent = TOAST_ACCENTS[kind];
  const toast = document.createElement('div');
  toast.id = 'click-a-magnet-toast';
  toast.textContent = `❯ ${text}`;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: '2147483647',
    maxWidth: '360px',
    padding: '12px 16px',
    borderRadius: '10px',
    background: '#1e1e2e',
    color: accent,
    border: `1px solid ${accent}`,
    font: '13px/1.5 ui-monospace, "SF Mono", Menlo, Monaco, monospace',
    boxShadow: `0 8px 28px rgba(0, 0, 0, 0.45), 0 0 16px ${accent}33`,
    opacity: '0',
    transform: 'translateY(-4px)',
    transition: 'opacity 220ms ease, transform 220ms ease',
    pointerEvents: 'none',
  });
  document.documentElement.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const lifetime = kind === 'error' ? 5000 : 2500;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
    setTimeout(() => toast.remove(), 250);
  }, lifetime);
}
