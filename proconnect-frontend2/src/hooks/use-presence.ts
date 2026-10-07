'use client';

/**
 * Présence (statut « en ligne »).
 *
 * - `usePresenceHeartbeat` : à monter UNE fois (layout applicatif) — envoie un
 *   heartbeat au backend toutes les 60 s tant que l'utilisateur est connecté,
 *   en pause quand l'onglet est caché (l'utilisateur est alors considéré
 *   inactif côté serveur après 2 min sans heartbeat).
 * - `usePresence` : donne accès au store partagé des statuts en ligne, avec
 *   rafraîchissement par lot (1 requête pour N utilisateurs).
 */

import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { presenceApi } from '@/lib/api-services';
import { useAuthStore } from '@/store';

const HEARTBEAT_INTERVAL_MS = 60_000; // toutes les 60 s
const STATUSES_REFRESH_MS = 30_000; // rafraîchit les points verts toutes les 30 s

interface PresenceStore {
  /** Map userId → en ligne ? */
  online: Record<string, boolean>;
  /** Enregistre/rafraîchit les statuts d'un lot d'utilisateurs. */
  setMany: (statuses: Record<string, boolean>) => void;
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  online: {},
  setMany: (statuses) =>
    set((s) => ({ online: { ...s.online, ...statuses } })),
}));

/**
 * Hook partagé de rafraîchissement des statuts en ligne.
 * Toutes les 30 s, interroge le backend (1 requête) pour l'ensemble des
 * utilisateurs demandés par les composants montés, et met à jour le store.
 */
export function usePresence(userIds: Array<string | null | undefined>): boolean[] {
  const store = usePresenceStore();
  const key = userIds.filter(Boolean).sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;

    const refresh = () => {
      presenceApi
        .statuses(ids)
        .then((statuses) => usePresenceStore.getState().setMany(statuses))
        .catch(() => {
          /* silencieux — le prochain tick réessaiera */
        });
    };

    refresh();
    const interval = setInterval(refresh, STATUSES_REFRESH_MS);
    return () => clearInterval(interval);
  }, [key]);

  return userIds.map((id) => (id ? (store.online[id] ?? false) : false));
}

/** True si l'utilisateur donné est actuellement en ligne (selon le store partagé). */
export function useIsOnline(userId?: string | null): boolean {
  const [isOnline] = usePresence([userId ?? null]);
  return isOnline;
}

/**
 * Heartbeat de présence : à monter une seule fois dans le layout applicatif.
 * Envoie un POST /presence/heartbeat toutes les 60 s quand l'onglet est visible.
 */
export function usePresenceHeartbeat() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inFlight = useRef(false);

  const sendHeartbeat = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    presenceApi
      .heartbeat()
      .catch(() => {
        /* silencieux — réseau indisponible, on réessaiera au prochain tick */
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Heartbeat immédiat à la connexion, puis toutes les 60 s.
    sendHeartbeat();
    const interval = setInterval(() => {
      // Onglet en arrière-plan → on ne « ment » pas au serveur : la présence
      // expirera d'elle-même après 2 min sans heartbeat.
      if (document.visibilityState === 'visible') sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Rattrape le heartbeat au retour sur l'onglet.
    const onVisible = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, sendHeartbeat]);
}
