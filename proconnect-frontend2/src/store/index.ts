import { create } from 'zustand';
import type { PageView, Post, Conversation, Message, Notification, User } from '@/types';
import { feedApi, messagingApi, notificationsApi, authApi } from '@/lib/api-services';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/api';
import { mapMessage } from '@/lib/api-mappers';
import {
  startRealtime, stopRealtime, onNotification, onConversationMessage,
} from '@/lib/realtime';
import { useAuthStore, userFromResponse } from './auth-store';

/* ============================== Navigation ================================ */

interface NavigationStore {
  currentPage: PageView;
  previousPage: PageView | null;
  navigateTo: (page: PageView) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentPage: 'feed',
  previousPage: null,
  navigateTo: (page) => set({ previousPage: page, currentPage: page }),
}));

export { useAuthStore } from './auth-store';

/* =================== Accès espace d'administration ======================== */

/**
 * Gate de l'espace d'administration : il exige une connexion dédiée avec les
 * identifiants du compte Superadmin, même si l'utilisateur est déjà connecté
 * avec un compte ADMIN. Le déverrouillage vit en mémoire + sessionStorage :
 * il expire avec l'onglet et n'est pas lié au token applicatif.
 */
/** Jetons de la session classique, sauvegardés le temps de l'élévation Superadmin. */
const ADMIN_PREV_TOKENS_KEY = 'pc_admin_prev_tokens';

interface AdminAuthSession {
  user: User;
  /** Vrai juste après le 1er login (mot de passe temporaire à changer). */
  pendingPasswordChange: boolean;
}

interface AdminAuthStore {
  /** null = verrouillé → l'écran de connexion superadmin doit s'afficher. */
  session: AdminAuthSession | null;
  /**
   * Connecte le compte Superadmin (identifiants vérifiés par le serveur, rôle
   * SUPERADMIN exigé) et élève la session applicative vers ce compte.
   * Retourne 'ok' | 'mustChangePassword' | 'error'.
   */
  unlock: (email: string, password: string) => Promise<'ok' | 'mustChangePassword' | 'error'>;
  /** Confirme le changement de mot de passe au premier login Superadmin. */
  completePasswordChange: (newPassword: string) => Promise<void>;
  /**
   * Verrouille l'espace admin et restaure la session utilisateur précédente
   * (celle d'avant l'élévation Superadmin).
   */
  lock: () => void;
}

function savePreviousTokens(): void {
  if (typeof window === 'undefined') return;
  const at = getAccessToken();
  const rt = getRefreshToken();
  if (at || rt) {
    try { sessionStorage.setItem(ADMIN_PREV_TOKENS_KEY, JSON.stringify({ at, rt })); } catch { /* ignore */ }
  }
}

function restorePreviousTokens(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(ADMIN_PREV_TOKENS_KEY);
    sessionStorage.removeItem(ADMIN_PREV_TOKENS_KEY);
    if (!raw) return false;
    const { at, rt } = JSON.parse(raw) as { at?: string | null; rt?: string | null };
    if (!at) return false;
    setTokens(at, rt ?? undefined);
    return true;
  } catch {
    return false;
  }
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  session: null,

  unlock: async (email, password) => {
    try {
      const tokens = await authApi.login(email.trim(), password);
      // Sauvegarde de la session classique, PUIS pose des tokens superadmin :
      // `me()` doit être appelé avec le jeton du compte qui vient de se
      // connecter, sinon la vérification du rôle porte sur l'ancienne session.
      savePreviousTokens();
      setTokens(tokens.accessToken, tokens.refreshToken);
      const me = await authApi.me();
      if (me.role !== 'SUPERADMIN') {
        // Identifiants valides mais ce n'est pas le compte superadmin : refus.
        // On restaure la session précédente (rollback propre), sinon on reste
        // avec les tokens du compte refusé posés dans le localStorage.
        if (!restorePreviousTokens()) clearTokens();
        return 'error';
      }
      const user = userFromResponse(me, tokens.mustChangePassword);
      if (user.mustChangePassword) {
        // Premier login (mot de passe temporaire) : les tokens restent posés
        // (requis pour changer le mot de passe) mais la session applicative
        // n'est PAS encore élevée — le changement se fait dans l'écran admin.
        return 'mustChangePassword';
      }
      useAuthStore.getState().adoptSession(user);
      set({ session: { user, pendingPasswordChange: false } });
      return 'ok';
    } catch {
      return 'error';
    }
  },

  completePasswordChange: async (newPassword) => {
    // Les tokens superadmin sont déjà posés (1er login) : on change le mot de
    // passe, puis on élève la session applicative vers le compte Superadmin.
    await authApi.changePassword('', newPassword);
    const me = await authApi.me();
    const user = userFromResponse(me);
    useAuthStore.getState().adoptSession(user);
    set({ session: { user, pendingPasswordChange: false } });
  },

  lock: () => {
    set({ session: null });
    // Restaure la session utilisateur d'origine (avant l'élévation Superadmin).
    if (restorePreviousTokens()) {
      useAuthStore.getState().bootstrap();
    }
  },
}));

/* ================================= Feed =================================== */

interface FeedStore {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  filter: 'top' | 'recent' | 'connections';
  loadPosts: () => Promise<void>;
  createPost: (content: string, files?: File[]) => Promise<void>;
  updatePost: (
    postId: string,
    body: { content?: string; removeAttachmentIds?: string[] }
  ) => Promise<Post>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  setFilter: (filter: 'top' | 'recent' | 'connections') => void;
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  filter: 'recent',

  loadPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const page = await feedApi.list(0, 30);
      set({ posts: page.results, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createPost: async (content, files) => {
    const created = files && files.length > 0
      ? await feedApi.createWithMedia(content, files)
      : await feedApi.create(content);
    set((s) => ({ posts: [created, ...s.posts] }));
  },

  updatePost: async (postId, body) => {
    const updated = await feedApi.update(postId, body);
    set((s) => ({
      posts: s.posts.map((p) => (p.id === postId ? updated : p)),
    }));
    return updated;
  },

  toggleLike: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    // Mise à jour optimiste
    const like = !post.likedByMe;
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: like, likesCount: p.likesCount + (like ? 1 : -1) }
          : p
      ),
    }));
    try {
      const res = like ? await feedApi.like(postId) : await feedApi.unlike(postId);
      set((s) => ({
        posts: s.posts.map((p) => (p.id === postId ? { ...p, likesCount: res.likesCount } : p)),
      }));
    } catch {
      // Rollback si l'appel échoue
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !like, likesCount: p.likesCount + (like ? -1 : 1) }
            : p
        ),
      }));
    }
  },

  toggleSave: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const save = !post.isSaved;
    set((s) => ({
      posts: s.posts.map((p) => (p.id === postId ? { ...p, isSaved: save } : p)),
    }));
    try {
      if (save) await feedApi.bookmark(postId);
      else await feedApi.unbookmark(postId);
    } catch {
      set((s) => ({
        posts: s.posts.map((p) => (p.id === postId ? { ...p, isSaved: !save } : p)),
      }));
    }
  },

  addComment: async (postId, content) => {
    await feedApi.addComment(postId, content);
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      ),
    }));
  },

  setFilter: (filter) => set({ filter }),
}));

/* ============================== Messagerie ================================ */

export type ChatTab = 'all' | 'unread' | 'groups';

/** Normalise un message : garantit l'isDeleted par défaut et une date timezone-safe. */
function normalizeMessage(m: Message): Message {
  return { ...m, isDeleted: m.isDeleted ?? false, isEdited: m.isEdited ?? false };
}

/**
 * Ajoute (ou remplace) un message dans une conversation en évitant TOUT doublon :
 * - ignore si un message avec le même id existe déjà (broadcast STOMP vs réponse REST,
 *   l'ordre d'arrivée n'est pas garanti) ;
 * - remplace si un message temporaire (id `tmp-`) correspond au même contenu/envoi.
 */
function upsertMessage(messages: Message[], incoming: Message): Message[] {
  if (messages.some((m) => m.id === incoming.id)) {
    return messages.map((m) => (m.id === incoming.id ? normalizeMessage(incoming) : m));
  }
  // Remplacement d'un message optimiste par le message confirmé du serveur.
  const tmpIndex = incoming.id.startsWith('tmp-')
    ? -1
    : messages.findIndex(
        (m) =>
          m.id.startsWith('tmp-') &&
          m.sender.id === incoming.sender.id &&
          (m.content ?? '') === (incoming.content ?? '') &&
          !!m.attachmentUrl === !!incoming.attachmentUrl
      );
  if (tmpIndex >= 0) {
    const next = [...messages];
    next[tmpIndex] = normalizeMessage(incoming);
    return next;
  }
  return [...messages, normalizeMessage(incoming)];
}

/**
 * Fusionne l'historique serveur avec les messages déjà connus (temps réel, optimistes) :
 * le serveur fait foi ; on ne garde que les messages optimistes (id tmp-) qui n'ont
 * pas encore de pendant serveur (même auteur, contenu et pièce jointe à ~1 min près).
 */
function mergeHistory(known: Message[], server: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of server) byId.set(m.id, normalizeMessage(m));
  for (const m of known) {
    if (byId.has(m.id)) continue;
    if (!m.id.startsWith('tmp-')) continue;
    const matched = server.some(
      (sm) =>
        sm.sender.id === m.sender.id &&
        (sm.content ?? '') === (m.content ?? '') &&
        !!sm.attachmentUrl === !!m.attachmentUrl &&
        Math.abs(new Date(sm.createdAt).getTime() - new Date(m.createdAt).getTime()) < 60_000
    );
    if (!matched) byId.set(m.id, m);
  }
  return [...byId.values()];
}

interface MessagingStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  chatTab: ChatTab;
  loadConversations: () => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createGroup: (name: string, participantIds: string[]) => Promise<Conversation>;
  startDirect: (participantId: string) => Promise<Conversation>;
  markRead: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  sendAttachment: (conversationId: string, file: File, content?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  transferMessage: (messageId: string, targetConversationId: string) => Promise<Message>;
  /** Abonne la conversation aux messages temps réel (appelé à l'ouverture du chat). */
  subscribeRealtime: (conversationId: string) => () => void;
  /** Notifie les stores qu'une session vient de s'ouvrir (login). */
  initRealtime: () => void;
  shutdownRealtime: () => void;
  setActiveConversation: (id: string | null) => void;
  setChatTab: (tab: ChatTab) => void;
}

export const useMessagingStore = create<MessagingStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  chatTab: 'all',

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await messagingApi.conversations();
      set({ conversations, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  openConversation: async (conversationId) => {
    set({ activeConversationId: conversationId, isLoadingMessages: true });
    try {
      const page = await messagingApi.history(conversationId);
      set((s) => ({
        // Dédupe l'historique avec les messages déjà reçus en temps réel.
        messages: {
          ...s.messages,
          [conversationId]: mergeHistory(s.messages[conversationId] ?? [], page.results),
        },
        isLoadingMessages: false,
      }));
      await messagingApi.markRead(conversationId);
      // RAFRAICHIR la liste pour remettre les compteurs à zéro
      get().loadConversations();
    } catch (e) {
      set({ isLoadingMessages: false, error: (e as Error).message });
    }
  },

  sendMessage: async (conversationId, content) => {
    // Mise à jour optimiste (id temporaire) : le message s'affiche instantanément.
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const currentUser = useAuthStore.getState().currentUser;
    const optimistic: Message = {
      id: tmpId,
      conversationId,
      sender: currentUser ?? ({ id: '?', firstName: '?', lastName: '?', email: '' } as User),
      content,
      attachmentUrl: null,
      attachmentType: null,
      attachmentName: null,
      attachmentSize: null,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: upsertMessage(s.messages[conversationId] ?? [], optimistic),
      },
    }));
    try {
      const message = await messagingApi.send(conversationId, content);
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: upsertMessage(s.messages[conversationId] ?? [], message),
        },
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: message } : c
        ),
      }));
    } catch (e) {
      // Échec : retire le message optimiste pour ne pas laisser un fantôme.
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m.id !== tmpId),
        },
      }));
      throw e;
    }
  },

  createGroup: async (name, participantIds) => {
    const conversation = await messagingApi.createGroup(name, participantIds);
    set((s) => ({ conversations: [conversation, ...s.conversations] }));
    return conversation;
  },

  startDirect: async (participantId) => {
    const conversation = await messagingApi.startDirect(participantId);
    set((s) => {
      const exists = s.conversations.some((c) => c.id === conversation.id);
      return {
        conversations: exists ? s.conversations : [conversation, ...s.conversations],
        activeConversationId: conversation.id,
      };
    });
    return conversation;
  },

  markRead: async (conversationId) => {
    await messagingApi.markRead(conversationId);
  },

  deleteConversation: async (conversationId) => {
    await messagingApi.deleteConversation(conversationId);
    set((s) => {
      const messages = { ...s.messages };
      delete messages[conversationId];
      return {
        conversations: s.conversations.filter((c) => c.id !== conversationId),
        messages,
        activeConversationId: s.activeConversationId === conversationId ? null : s.activeConversationId,
      };
    });
  },

  sendAttachment: async (conversationId, file, content) => {
    const message = await messagingApi.sendWithAttachment(conversationId, file, content);
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: upsertMessage(s.messages[conversationId] ?? [], message),
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message } : c
      ),
    }));
  },

  editMessage: async (messageId, content) => {
    const updated = await messagingApi.editMessage(messageId, content);
    set((s) => {
      const convId = updated.conversationId;
      return {
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map((m) =>
            m.id === messageId ? normalizeMessage(updated) : m
          ),
        },
      };
    });
  },

  deleteMessage: async (messageId) => {
    const updated = await messagingApi.deleteMessage(messageId);
    set((s) => {
      const convId = updated.conversationId;
      return {
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map((m) =>
            m.id === messageId ? normalizeMessage(updated) : m
          ),
        },
      };
    });
  },

  transferMessage: async (messageId, targetConversationId) => {
    const message = await messagingApi.transferMessage(messageId, targetConversationId);
    set((s) => ({
      messages: {
        ...s.messages,
        [targetConversationId]: upsertMessage(s.messages[targetConversationId] ?? [], message),
      },
      conversations: s.conversations.map((c) =>
        c.id === targetConversationId ? { ...c, lastMessage: message } : c
      ),
    }));
    return message;
  },

  subscribeRealtime: (conversationId) => {
    // Les messages entrants passent par upsertMessage : jamais de doublon, même si le
    // broadcast STOMP arrive avant/après la réponse REST, et les éditions/suppressions
    // (même id) remplacent le message existant au lieu d'être ajoutées.
    return onConversationMessage(conversationId, (raw: any) => {
      // Le payload STOMP brut suit le DTO backend : on le mappe (dates timezone-safe,
      // avatar…) comme une réponse REST avant de l'insérer.
      const incoming = normalizeMessage(mapMessage(raw));
      if (!incoming?.id) return;
      const state = get();
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: upsertMessage(s.messages[conversationId] ?? [], incoming),
        },
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: incoming } : c
        ),
      }));
      // Si la conversation est ouverte et visible → marque comme lu.
      if (state.activeConversationId === conversationId) {
        messagingApi.markRead(conversationId).catch(() => {});
      }
    });
  },

  initRealtime: () => {
    startRealtime();
    // Notifications push temps réel → store + rafraîchissement conversations
    onNotification((raw: any) => {
      const notification = raw as Notification;
      const s = useNotificationStore.getState();
      const exists = s.notifications.some((n) => n.id === notification.id);
      if (exists) return;
      useNotificationStore.setState({
        notifications: [notification, ...s.notifications],
        unreadCount: s.unreadCount + (notification.isRead ? 0 : 1),
      });
      // Un nouveau message peut concerner une conversation pas encore dans la liste.
      if (notification.notificationType === 'NEW_MESSAGE') {
        get().loadConversations();
      }
    });
  },

  shutdownRealtime: () => stopRealtime(),

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setChatTab: (tab) => set({ chatTab: tab }),
}));

/* ============================ Notifications =============================== */

/**
 * Les notifications lues sont masquées de façon PERSISTANTE (localStorage) :
 * elles ne réapparaissent pas au rechargement de la page. Seules les non lues
 * restent visibles (filtres « Tout » et « Non lues »).
 */
function dismissedStore(userId: string) {
  const key = `pc_dismissed_notifications_${userId}`;
  return {
    read(): Set<string> {
      try {
        return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]);
      } catch {
        return new Set<string>();
      }
    },
    add(ids: string[]): void {
      if (ids.length === 0) return;
      const all = this.read();
      ids.forEach((id) => all.add(id));
      try {
        localStorage.setItem(key, JSON.stringify([...all]));
      } catch {
        /* quota dépassé — silencieux */
      }
    },
  };
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const page = await notificationsApi.list(false, 0, 50);
      const currentUser = useAuthStore.getState().currentUser;
      const dismissed = currentUser ? dismissedStore(currentUser.id).read() : new Set<string>();
      const visible = page.results.filter((n) => !dismissed.has(n.id) || !n.isRead);
      set({
        notifications: visible,
        unreadCount: visible.filter((n) => !n.isRead).length,
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  markAsRead: async (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target) return;
    // Masquage persistant : même après rechargement, la notification lue ne réapparaît pas.
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser) dismissedStore(currentUser.id).add([id]);
    set((s) => ({
      // Une notification lue disparaît de la liste (demande produit).
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: target.isRead ? s.unreadCount : Math.max(0, s.unreadCount - 1),
    }));
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* silencieux */
    }
  },

  markAllAsRead: async () => {
    // Masquage persistant de toutes les notifications actuelles.
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser) {
      dismissedStore(currentUser.id).add(get().notifications.map((n) => n.id));
    }
    set((s) => ({
      // Cohérent avec la disparition à la lecture : la liste se vide.
      notifications: [],
      unreadCount: 0,
    }));
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* silencieux */
    }
  },
}));

/* ================================ Divers ================================== */

interface ProfileStore {
  viewingUserId: string | null;
  setViewingUserId: (id: string | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  viewingUserId: null,
  setViewingUserId: (id) => set({ viewingUserId: id }),
}));

interface SearchStore {
  searchQuery: string;
  isSearchOpen: boolean;
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  searchQuery: '',
  isSearchOpen: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
}));

/* ================= Préférences (sons, thème) — inchangé =================== */

interface PreferencesStore {
  soundEnabled: boolean;
  soundPreset: string;
  soundVolume: number;
  soundForMessageSent: boolean;
  soundForMessageReceived: boolean;
  soundForNotification: boolean;
  soundForCallRing: boolean;
  soundForCallConnect: boolean;
  soundForGroupMessage: boolean;
  soundForLike: boolean;
  themeColorPreset: string;
  backgroundPreset: string;
  darkMode: 'light' | 'dark' | 'system';
  setSoundEnabled: (v: boolean) => void;
  setSoundPreset: (v: string) => void;
  setSoundVolume: (v: number) => void;
  setSoundForType: (type: string, v: boolean) => void;
  setThemeColorPreset: (v: string) => void;
  setBackgroundPreset: (v: string) => void;
  setDarkMode: (v: 'light' | 'dark' | 'system') => void;
  hydrate: () => void;
}

function readLS(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(`pc_${key}`) ?? fallback;
}
function readLSBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(`pc_${key}`);
  return v === null ? fallback : v === 'true';
}
function readLSNum(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(`pc_${key}`);
  return v === null ? fallback : Number(v);
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  soundEnabled: true,
  soundPreset: 'classic',
  soundVolume: 0.7,
  soundForMessageSent: true,
  soundForMessageReceived: true,
  soundForNotification: true,
  soundForCallRing: true,
  soundForCallConnect: true,
  soundForGroupMessage: true,
  soundForLike: true,
  themeColorPreset: 'sky',
  backgroundPreset: 'white',
  darkMode: 'light',

  setSoundEnabled: (v) => { localStorage.setItem('pc_sound_enabled', String(v)); set({ soundEnabled: v }); },
  setSoundPreset: (v) => { localStorage.setItem('pc_sound_preset', v); set({ soundPreset: v }); },
  setSoundVolume: (v) => { localStorage.setItem('pc_sound_volume', String(v)); set({ soundVolume: v }); },
  setSoundForType: (type, v) => {
    localStorage.setItem(`pc_sound_${type}`, String(v));
    set((s) => ({ ...s, [`soundFor${type.charAt(0).toUpperCase() + type.slice(1)}`]: v }));
  },
  setThemeColorPreset: (v) => { localStorage.setItem('pc_theme_color', v); set({ themeColorPreset: v }); },
  setBackgroundPreset: (v) => { localStorage.setItem('pc_background', v); set({ backgroundPreset: v }); },
  setDarkMode: (v) => { localStorage.setItem('pc_dark_mode', v); set({ darkMode: v }); },

  hydrate: () => {
    set({
      soundEnabled: readLSBool('sound_enabled', true),
      soundPreset: readLS('sound_preset', 'classic'),
      soundVolume: readLSNum('sound_volume', 0.7),
      soundForMessageSent: readLSBool('sound_messageSent', true),
      soundForMessageReceived: readLSBool('sound_messageReceived', true),
      soundForNotification: readLSBool('sound_notification', true),
      soundForCallRing: readLSBool('sound_callRing', true),
      soundForCallConnect: readLSBool('sound_callConnect', true),
      soundForGroupMessage: readLSBool('sound_groupMessage', true),
      soundForLike: readLSBool('sound_like', true),
      themeColorPreset: readLS('theme_color', 'sky'),
      backgroundPreset: readLS('background', 'white'),
      darkMode: readLS('dark_mode', 'light') as 'light' | 'dark' | 'system',
    });
  },
}));
