'use client';

/**
 * Accusés d'envoi et de lecture sous un message envoyé (style messagerie) :
 * - « pending »   : envoi en cours (aucun message serveur encore) ;
 * - « sent »      : une coche — le message est stocké côté serveur ;
 * - « delivered » : deux coches grises — au moins un destinataire a l'app ouverte
 *                   (en ligne) ou a déjà lu un message plus récent ;
 * - « read »      : deux coches vertes — tous les destinataires ont consulté
 *                   la conversation après ce message (lastReadAt ≥ createdAt).
 * L'affichage est paramétrable (Paramètres → Notifications) via la préférence
 * `messageStatusTicks`.
 */

import { Check, CheckCheck, Loader2 } from 'lucide-react';
import type { Conversation, Message } from '@/types';
import { cn } from '@/lib/utils';

export type MessageTickState = 'pending' | 'sent' | 'delivered' | 'read';

/** Calcul du statut d'un message envoyé à partir des accusés de conversation. */
export function computeMessageTickState(
  message: Message,
  conversation: Conversation,
  currentUserId: string
): MessageTickState {
  if (message.id.startsWith('tmp-')) return 'pending';
  const others = conversation.participants.filter((p) => p.id !== currentUserId);
  if (others.length === 0) return 'delivered';
  const receipts = conversation.readReceipts ?? {};
  const msgTime = new Date(message.createdAt).getTime();
  const readCount = others.filter((p) => {
    const lastRead = receipts[p.id];
    return !!lastRead && new Date(lastRead).getTime() >= msgTime;
  }).length;
  const onlineCount = others.filter((p) => p.online).length;
  if (readCount === others.length) return 'read';
  if (readCount > 0 || onlineCount === others.length) return 'delivered';
  return 'sent';
}

export function MessageStatusTicks({ state }: { state: MessageTickState }) {
  if (state === 'pending') {
    return (
      <Loader2
        className="h-3 w-3 text-gray-400 animate-spin"
        aria-label="Envoi en cours"
      />
    );
  }
  if (state === 'sent') {
    return (
      <Check
        className="h-3 w-3 text-gray-400"
        aria-label="Envoyé"
      />
    );
  }
  return (
    <CheckCheck
      className={cn('h-3 w-3', state === 'read' ? 'text-green-500' : 'text-gray-400')}
      aria-label={state === 'read' ? 'Lu' : 'Livré'}
    />
  );
}
