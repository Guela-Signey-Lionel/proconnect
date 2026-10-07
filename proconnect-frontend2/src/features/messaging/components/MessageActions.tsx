'use client';

/**
 * Actions d'un message (menu 3 points, apparaît au survol) :
 * Copier · Modifier · Supprimer · Transférer · Télécharger (pièce jointe).
 */

import { useState } from 'react';
import {
  Copy,
  Pencil,
  Trash2,
  Forward,
  Download,
  MoreVertical,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMessagingStore, useAuthStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import type { Conversation, Message } from '@/types';

interface MessageActionsProps {
  message: Message;
  conversation: Conversation;
  isSent: boolean;
  hasAttachment: boolean;
  /** Désactive l'édition (ex. pièce jointe non textuelle). */
  canEdit: boolean;
}

export function MessageActions({
  message,
  conversation,
  isSent,
  hasAttachment,
  canEdit,
}: MessageActionsProps) {
  const deleteMessage = useMessagingStore((s) => s.deleteMessage);
  const editMessage = useMessagingStore((s) => s.editMessage);
  const transferMessage = useMessagingStore((s) => s.transferMessage);
  const conversations = useMessagingStore((s) => s.conversations);
  const loadConversations = useMessagingStore((s) => s.loadConversations);
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? '');

  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? '');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferQuery, setTransferQuery] = useState('');

  const isDeleted = !!message.isDeleted;
  // Transférer : toutes les autres conversations dont je suis membre.
  const transferTargets = conversations.filter(
    (c) => c.id !== conversation.id
  );
  const filteredTargets = transferTargets.filter((c) => {
    if (!transferQuery.trim()) return true;
    const name = c.isGroup
      ? c.name ?? ''
      : c.participants.map((p) => `${p.firstName} ${p.lastName}`).join(' ');
    return name.toLowerCase().includes(transferQuery.toLowerCase());
  });

  const handleCopy = async () => {
    const text = message.content ?? '';
    const attachment = message.attachmentUrl ?? '';
    const payload = [text, attachment].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(payload || ' ');
      toast({ title: 'Copié', description: 'Le message a été copié dans le presse-papiers.' });
    } catch {
      toast({ title: 'Impossible de copier', description: 'Votre navigateur a refusé l’accès au presse-papiers.', variant: 'destructive' });
    }
  };

  const handleEditOpen = () => {
    setEditValue(message.content ?? '');
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    const content = editValue.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await editMessage(message.id, content);
      setEditOpen(false);
      toast({ title: 'Message modifié' });
    } catch (e) {
      toast({ title: 'Échec de la modification', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteMessage(message.id);
      toast({ title: 'Message supprimé' });
    } catch (e) {
      toast({ title: 'Échec de la suppression', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (targetId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await transferMessage(message.id, targetId);
      setTransferOpen(false);
      setTransferQuery('');
      toast({ title: 'Message transféré' });
    } catch (e) {
      toast({ title: 'Échec du transfert', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (isDeleted) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/10 shrink-0'
            )}
            aria-label="Actions du message"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isSent ? 'end' : 'start'} className="w-48">
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copier
          </DropdownMenuItem>
          {isSent && canEdit && (
            <DropdownMenuItem onClick={handleEditOpen}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
          )}
          {hasAttachment && (
            <DropdownMenuItem asChild>
              <a
                href={message.attachmentUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
                download={message.attachmentName ?? undefined}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </a>
            </DropdownMenuItem>
          )}
          {transferTargets.length > 0 && (
            <DropdownMenuItem onClick={() => setTransferOpen(true)}>
              <Forward className="h-4 w-4 mr-2" />
              Transférer
            </DropdownMenuItem>
          )}
          {isSent && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog d'édition */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le message</DialogTitle>
            <DialogDescription>
              Le message affichera la mention « modifié ».
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEditSubmit();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              <X className="h-4 w-4 mr-1.5" />
              Annuler
            </Button>
            <Button onClick={handleEditSubmit} disabled={busy || !editValue.trim()} className="bg-sky-500 hover:bg-sky-600 text-white">
              <Check className="h-4 w-4 mr-1.5" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de transfert */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transférer le message</DialogTitle>
            <DialogDescription>
              Choisissez la conversation de destination.
            </DialogDescription>
          </DialogHeader>
          {transferTargets.length > 5 && (
            <Input
              placeholder="Rechercher…"
              value={transferQuery}
              onChange={(e) => setTransferQuery(e.target.value)}
            />
          )}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredTargets.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Aucune autre conversation disponible.
              </p>
            ) : (
              filteredTargets.map((c) => {
                const other = c.participants.find((p) => p.id !== currentUserId);
                const directName =
                  other?.fullName ?? `${other?.firstName ?? ''} ${other?.lastName ?? ''}`.trim();
                const name = c.isGroup ? c.name ?? 'Groupe' : directName || 'Conversation';
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleTransfer(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sky-50 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.isGroup ? '👥' : (name.charAt(0).toUpperCase() || '?')}
                    </span>
                    <span className="text-sm truncate">{name}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}