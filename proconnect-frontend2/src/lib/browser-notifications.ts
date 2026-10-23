'use client';

/**
 * Notifications « navigateur » pour les nouveaux messages :
 * - notification système (haut de l'écran / centre de notifications),
 * - son joué par l'appelant (lib/sounds),
 * - compteur dans le titre de l'onglet (en haut du navigateur).
 */

const TITLE_BASE = 'ProConnect';

/** Permission de notification : la demande une seule fois, si nécessaire. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Affiche une notification système si le navigateur l'autorise.
 * Un clic sur la notification ramène l'application au premier plan.
 */
export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && window.document.hasFocus()) return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/logo.svg',
      tag: 'proconnect-message',
      silent: true, // le son est géré par l'app (préférences son)
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* onglet fermé ou fond : sans effet */
      }
      onClick?.();
      n.close();
    };
    // Auto-fermeture (certaines plates-formes l'affichent indéfiniment).
    setTimeout(() => {
      try { n.close(); } catch { /* déjà fermée */ }
    }, 8000);
  } catch {
    /* Notification non supportée dans ce contexte */
  }
}

/**
 * Met à jour le titre de l'onglet avec le nombre de messages non lus :
 * « (3) Messagerie — ProConnect ». Appelé à chaque changement de compteur.
 */
export function updateBrowserTitle(unreadMessages: number): void {
  if (typeof window === 'undefined') return;
  document.title = unreadMessages > 0
    ? `(${unreadMessages > 99 ? '99+' : unreadMessages}) Messagerie — ${TITLE_BASE}`
    : TITLE_BASE;
}

/** Recalcule le compteur du titre après les changements du store de conversations. */
export function refreshBrowserTitle(totalUnread: number): void {
  updateBrowserTitle(totalUnread);
}
