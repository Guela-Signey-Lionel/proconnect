import { create } from 'zustand';
import type { User, UserResponse } from '@/types';
import { authApi } from '@/lib/api-services';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/api';
import { startRealtime, stopRealtime } from '@/lib/realtime';
import { useMessagingStore } from './index';

export function userFromResponse(u: UserResponse, mustChangePassword?: boolean): User {
  const { firstName: fn, lastName: ln } = { firstName: u.firstName, lastName: u.lastName };
  return {
    id: u.id,
    firstName: fn,
    lastName: ln,
    email: u.email,
    fullName: `${fn} ${ln}`.trim(),
    avatar: u.avatarUrl ?? null,
    role: u.role,
    active: u.active,
    mustChangePassword: mustChangePassword ?? u.mustChangePassword ?? false,
    isAdmin: u.role === 'ADMIN' || u.role === 'SUPERADMIN',
    isSuperAdmin: u.role === 'SUPERADMIN',
  } as User;
}

interface AuthStore {
  isAuthenticated: boolean;
  currentUser: User | null;
  isBootstrapping: boolean;
  /** Splash de bienvenue (~3s) affiché juste après une connexion réussie. */
  isEntering: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (body: { email: string; firstName: string; lastName: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
  /** Termine manuellement le splash de bienvenue. */
  finishEntering: () => void;
  /** Restaure la session au chargement depuis le token stocké. */
  bootstrap: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  /**
   * Remplace la session courante par celle d'un utilisateur déjà authentifié
   * (élévation vers le compte Superadmin depuis l'écran de connexion admin).
   */
  adoptSession: (user: User, tokens?: { accessToken: string; refreshToken: string }) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  currentUser: null,
  isBootstrapping: true,
  isEntering: false,

  login: async (email, password) => {
    const tokens = await authApi.login(email, password);
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await authApi.me();
    set({
      isAuthenticated: true,
      currentUser: userFromResponse(me, tokens.mustChangePassword),
      isEntering: true,
    });
    useMessagingStore.getState().initRealtime();
  },

  loginWithGoogle: async (idToken) => {
    const tokens = await authApi.googleLogin(idToken);
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await authApi.me();
    set({ isAuthenticated: true, currentUser: userFromResponse(me), isEntering: true });
    useMessagingStore.getState().initRealtime();
  },

  register: async (body) => {
    await authApi.register(body);
    // Connexion automatique après inscription
    const tokens = await authApi.login(body.email, body.password);
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await authApi.me();
    set({ isAuthenticated: true, currentUser: userFromResponse(me), isEntering: true });
    useMessagingStore.getState().initRealtime();
  },

  finishEntering: () => set({ isEntering: false }),

  logout: () => {
    useMessagingStore.getState().shutdownRealtime();
    clearTokens();
    set({ isAuthenticated: false, currentUser: null, isEntering: false });
  },

  bootstrap: async () => {
    // Pas de token → pas de session.
    if (!getAccessToken() && !getRefreshToken()) {
      set({ isBootstrapping: false, isAuthenticated: false, currentUser: null });
      return;
    }
    try {
      const me = await authApi.me();
      set({ isAuthenticated: true, currentUser: userFromResponse(me), isBootstrapping: false });
      useMessagingStore.getState().initRealtime();
    } catch {
      clearTokens();
      set({ isBootstrapping: false, isAuthenticated: false, currentUser: null });
    }
  },

  refreshCurrentUser: async () => {
    try {
      const me = await authApi.me();
      set({ currentUser: userFromResponse(me) });
    } catch {
      /* ignore */
    }
  },

  adoptSession: (user, tokens) => {
    if (tokens) setTokens(tokens.accessToken, tokens.refreshToken);
    set({
      isAuthenticated: true,
      currentUser: user,
      isBootstrapping: false,
      // Pas de splash de bienvenue : on entre dans l'espace d'administration.
      isEntering: false,
    });
    useMessagingStore.getState().initRealtime();
  },
}));

/** Session expirée (event émis par le client API) → déconnexion propre. */
if (typeof window !== 'undefined') {
  window.addEventListener('pc:session-expired', () => {
    useAuthStore.getState().logout();
  });
}
