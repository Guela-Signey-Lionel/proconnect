/**
 * Client STOMP temps réel ProConnect.
 * - /topic/conversations/{id}  → nouveaux messages d'une conversation
 * - /user/queue/notifications  → notifications personnelles (message, like, invitation…)
 *
 * Utilise SockJS (fallback polling) + JWT en query string, avec reconnexion
 * automatique et reconnexion après un changement de session (login/logout).
 */

import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL, getAccessToken } from '@/lib/api';

type MessageHandler = (payload: any) => void;

let client: Client | null = null;
let notificationSubscription: { unsubscribe: () => void } | null = null;
let notificationHandlers = new Set<MessageHandler>();
/** conversationId → handlers des ChatView ouverts. */
const conversationHandlers = new Map<string, Set<MessageHandler>>();
/** conversationId → souscription STOMP active (désabonnement propre, pas de fuite). */
const conversationSubscriptions = new Map<string, { unsubscribe: () => void }>();

function wsUrl(): string {
  const token = getAccessToken();
  return `${API_BASE_URL}/ws/notifications?token=${encodeURIComponent(token ?? '')}`;
}

function connect(): void {
  if (typeof window === 'undefined') return;
  const token = getAccessToken();
  if (!token) return; // pas de session → pas de connexion

  disconnect();

  client = new Client({
    webSocketFactory: () => new SockJS(wsUrl()) as unknown as WebSocket,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      // Notifications personnelles
      notificationSubscription = client?.subscribe('/user/queue/notifications', (msg: IMessage) => {
        try {
          const payload = JSON.parse(msg.body);
          notificationHandlers.forEach((h) => h(payload));
        } catch { /* ignore */ }
      }) ?? null;
      // Re-souscription aux conversations ouvertes
      conversationHandlers.forEach((_handlers, conversationId) => {
        subscribeConversation(conversationId);
      });
    },
    onWebSocketClose: () => { /* reconnectDelay gère la reconnexion */ },
    onStompError: () => { /* silencieux, reconnect auto */ },
  });

  client.activate();
}

function disconnect(): void {
  if (client) {
    try { client.deactivate(); } catch { /* ignore */ }
    client = null;
  }
  // Les souscriptions meurent avec la connexion : on oublie leurs références.
  notificationSubscription = null;
  conversationSubscriptions.clear();
}

function subscribeConversation(conversationId: string): void {
  if (!client || conversationSubscriptions.has(conversationId)) return;
  const sub = client.subscribe(`/topic/conversations/${conversationId}`, (msg: IMessage) => {
    try {
      const payload = JSON.parse(msg.body);
      conversationHandlers.get(conversationId)?.forEach((h) => h(payload));
    } catch { /* ignore */ }
  });
  conversationSubscriptions.set(conversationId, sub);
}

function unsubscribeConversation(conversationId: string): void {
  const sub = conversationSubscriptions.get(conversationId);
  if (sub) {
    try { sub.unsubscribe(); } catch { /* ignore */ }
    conversationSubscriptions.delete(conversationId);
  }
}

/** Démarre la connexion temps réel (appelé après login/bootstrap). */
export function startRealtime(): void {
  connect();
}

/** Ferme la connexion (logout). */
export function stopRealtime(): void {
  conversationHandlers.clear();
  disconnect();
}

/** Réinitialise après un changement de token (refresh JWT). */
export function restartRealtime(): void {
  connect();
}

/** S'abonner aux notifications push personnelles. Retourne la fonction de désabonnement. */
export function onNotification(handler: MessageHandler): () => void {
  notificationHandlers.add(handler);
  return () => { notificationHandlers.delete(handler); };
}

/** S'abonner aux nouveaux messages d'une conversation ouverte. */
export function onConversationMessage(conversationId: string, handler: MessageHandler): () => void {
  let handlers = conversationHandlers.get(conversationId);
  if (!handlers) {
    handlers = new Set();
    conversationHandlers.set(conversationId, handlers);
    if (client?.connected) subscribeConversation(conversationId);
  }
  handlers.add(handler);
  return () => {
    handlers!.delete(handler);
    if (handlers!.size === 0) {
      // Plus personne n'écoute cette conversation → désabonnement STOMP effectif.
      conversationHandlers.delete(conversationId);
      unsubscribeConversation(conversationId);
    }
  };
}
