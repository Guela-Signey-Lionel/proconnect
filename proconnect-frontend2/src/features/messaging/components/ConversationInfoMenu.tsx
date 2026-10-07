'use client';

import { useMemo, useState } from 'react';
import {
  MoreVertical,
  Info,
  Users,
  Image as ImageIcon,
  Link2,
  FileText,
  Palette,
  Ban,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  Download,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useMessagingStore } from '@/store';
import { connectionsApi } from '@/lib/api-services';
import type { Conversation, Message } from '@/types';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ImageLightbox } from './ImageLightbox';
import { toast } from '@/hooks/use-toast';

/** Extrait les URLs http(s) d'un texte. */
const LINK_REGEX = /https?:\/\/[^\s<>"']+/gi;

function extractLinks(content: string | null | undefined): string[] {
  if (!content) return [];
  return content.match(LINK_REGEX) ?? [];
}

function downloadUrl(url: string, name?: string | null) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name || '';
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Thèmes de bulles par conversation (persistés en localStorage). */
const THEME_PRESETS = [
  { key: 'default', label: 'Bleu (par défaut)', sent: 'bg-sky-500', sentHover: 'hover:bg-sky-600', accent: 'text-sky-600' },
  { key: 'emerald', label: 'Vert', sent: 'bg-emerald-500', sentHover: 'hover:bg-emerald-600', accent: 'text-emerald-600' },
  { key: 'violet', label: 'Violet', sent: 'bg-violet-500', sentHover: 'hover:bg-violet-600', accent: 'text-violet-600' },
  { key: 'rose', label: 'Rose', sent: 'bg-rose-500', sentHover: 'hover:bg-rose-600', accent: 'text-rose-600' },
  { key: 'amber', label: 'Ambre', sent: 'bg-amber-500', sentHover: 'hover:bg-amber-600', accent: 'text-amber-600' },
  { key: 'slate', label: 'Gris', sent: 'bg-slate-600', sentHover: 'hover:bg-slate-700', accent: 'text-slate-600' },
];

function themeKeyFor(conversationId: string): string {
  return localStorage.getItem(`pc_chat_theme_${conversationId}`) ?? 'default';
}

type MenuTab = 'infos' | 'medias' | 'liens' | 'documents' | 'theme';

interface ConversationInfoMenuProps {
  conversation: Conversation;
}

export function ConversationInfoMenu({ conversation }: ConversationInfoMenuProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const deleteConversation = useMessagingStore((s) => s.deleteConversation);
  const messages = useMessagingStore((s) => s.messages[conversation.id]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MenuTab>('infos');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState<string>(() =>
    typeof window !== 'undefined' ? themeKeyFor(conversation.id) : 'default'
  );
  const [muted, setMuted] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(`pc_chat_muted_${conversation.id}`) === 'true'
      : false
  );

  const isDirect = !conversation.isGroup;
  const other = conversation.participants.find((p) => p.id !== currentUser?.id) ?? conversation.participants[0] ?? null;

  /** Récapitulatif médias / liens / documents à partir des messages chargés. */
  const media = useMemo(() => {
    const list = messages ?? [];
    const alive = list.filter((m: Message) => !m.isDeleted);
    return {
      images: alive.filter((m) => m.attachmentType === 'IMAGE'),
      videos: alive.filter((m) => m.attachmentType === 'VIDEO'),
      audios: alive.filter((m) => m.attachmentType === 'AUDIO'),
      documents: alive.filter((m) => m.attachmentType === 'FILE'),
      links: alive
        .map((m) => ({ message: m, urls: extractLinks(m.content) }))
        .filter((x) => x.urls.length > 0)
        .flatMap((x) => x.urls.map((url) => ({ message: x.message, url }))),
    };
  }, [messages]);

  const mediaCount =
    media.images.length + media.videos.length + media.audios.length + media.documents.length + media.links.length;

  const handleDelete = async () => {
    setIsBusy(true);
    try {
      await deleteConversation(conversation.id);
      setConfirmDelete(false);
      setOpen(false);
      toast({ title: 'Conversation supprimée de votre liste' });
    } catch (e) {
      toast({
        title: 'Suppression impossible',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!other) return;
    setIsBusy(true);
    try {
      await connectionsApi.block(other.id);
      setConfirmBlock(false);
      setOpen(false);
      toast({ title: 'Utilisateur bloqué' });
    } catch (e) {
      toast({
        title: 'Impossible de bloquer cet utilisateur',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const toggleMuted = (v: boolean) => {
    setMuted(v);
    localStorage.setItem(`pc_chat_muted_${conversation.id}`, String(v));
  };

  const applyTheme = (key: string) => {
    setThemeKey(key);
    localStorage.setItem(`pc_chat_theme_${conversation.id}`, key);
  };

  return (
    <>
      {/* ===== Bouton burger 3 points ===== */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Options de la discussion"
            title="Options de la discussion"
          >
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => { setTab('infos'); setOpen(true); }}>
            <Info className="h-4 w-4 mr-2" />
            {isDirect ? 'Informations' : 'Membres du groupe'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTab('medias'); setOpen(true); }}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Médias
            {media.images.length + media.videos.length + media.audios.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {media.images.length + media.videos.length + media.audios.length}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTab('liens'); setOpen(true); }}>
            <Link2 className="h-4 w-4 mr-2" />
            Liens
            {media.links.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{media.links.length}</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTab('documents'); setOpen(true); }}>
            <FileText className="h-4 w-4 mr-2" />
            Documents
            {media.documents.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{media.documents.length}</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTab('theme'); setOpen(true); }}>
            <Palette className="h-4 w-4 mr-2" />
            Thème de la discussion
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toggleMuted(!muted)}>
            {muted ? (
              <>
                <VolumeX className="h-4 w-4 mr-2 text-amber-600" />
                Réactiver les sons
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Couper les sons
              </>
            )}
          </DropdownMenuItem>
          {isDirect && other && (
            <DropdownMenuItem onClick={() => setConfirmBlock(true)} className="text-amber-600 focus:text-amber-700">
              <Ban className="h-4 w-4 mr-2" />
              Bloquer {other.firstName}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-red-600 focus:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ===== Panneau d'informations ===== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <DialogTitle className="text-base">
              {isDirect ? 'Informations de la discussion' : conversation.name ?? 'Groupe'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isDirect
                ? 'Détails du contact, médias partagés et préférences.'
                : `${conversation.participants.length} membres · médias et préférences.`}
            </DialogDescription>
          </DialogHeader>

          {/* Onglets */}
          <div className="px-4 flex gap-1 bg-muted/50 rounded-lg mx-4 p-1 shrink-0">
            {([
              ['infos', 'Infos'],
              ['medias', `Médias`],
              ['liens', 'Liens'],
              ['documents', 'Docs'],
              ['theme', 'Thème'],
            ] as [MenuTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all',
                  tab === key ? 'bg-background text-sky-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3">
              {/* ===== INFOS ===== */}
              {tab === 'infos' && (
                <div className="space-y-4">
                  {isDirect ? (
                    other && (
                      <div className="flex flex-col items-center text-center gap-2 pt-2">
                        <Avatar className="h-20 w-20">
                          {other.avatar && <AvatarImage src={other.avatar} alt={`${other.firstName} ${other.lastName}`} />}
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-xl font-semibold">
                            {getInitials(other.firstName, other.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {other.firstName} {other.lastName}
                          </p>
                          {other.jobTitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{other.jobTitle}</p>
                          )}
                        </div>
                        <div className="w-full space-y-2 mt-2 text-left">
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium truncate ml-4">{other.email}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Contact</span>
                            <span className="font-medium">
                              {other.phone || 'Non renseigné'}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sons de la discussion</span>
                            <Switch checked={!muted} onCheckedChange={(v) => toggleMuted(!v)} />
                          </div>
                          <Separator />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-sky-600" />
                        Membres ({conversation.participants.length})
                      </div>
                      {conversation.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 py-1.5">
                          <Avatar className="h-9 w-9">
                            {p.avatar && <AvatarImage src={p.avatar} alt={`${p.firstName} ${p.lastName}`} />}
                            <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-semibold">
                              {getInitials(p.firstName, p.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.firstName} {p.lastName}
                              {p.id === currentUser?.id && (
                                <span className="text-xs text-muted-foreground font-normal"> (vous)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                          {p.phone && (
                            <span className="text-xs text-muted-foreground shrink-0">{p.phone}</span>
                          )}
                        </div>
                      ))}
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sons de la discussion</span>
                        <Switch checked={!muted} onCheckedChange={(v) => toggleMuted(!v)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== MEDIAS ===== */}
              {tab === 'medias' && (
                <div className="space-y-4">
                  {mediaCount === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun média partagé dans cette discussion.
                    </p>
                  ) : (
                    <>
                      {media.images.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Images ({media.images.length})
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {media.images.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => setLightboxSrc(m.attachmentUrl ?? '')}
                                className="aspect-square rounded-lg overflow-hidden border border-border"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.attachmentUrl ?? ''} alt={m.attachmentName ?? ''} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {media.videos.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Vidéos ({media.videos.length})
                          </p>
                          <div className="space-y-2">
                            {media.videos.map((m) => (
                              <video
                                key={m.id}
                                src={m.attachmentUrl ?? ''}
                                controls
                                className="rounded-lg border border-border w-full max-h-56 bg-black"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {media.audios.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Audios ({media.audios.length})
                          </p>
                          <div className="space-y-2">
                            {media.audios.map((m) => (
                              <audio key={m.id} src={m.attachmentUrl ?? ''} controls className="w-full" />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ===== LIENS ===== */}
              {tab === 'liens' && (
                <div className="space-y-2">
                  {media.links.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun lien partagé dans cette discussion.
                    </p>
                  ) : (
                    media.links.map(({ message, url }) => (
                      <a
                        key={`${message.id}-${url}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <p className="text-sm text-sky-600 font-medium truncate">{url}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Partagé par {message.sender.firstName} {message.sender.lastName}
                        </p>
                      </a>
                    ))
                  )}
                </div>
              )}

              {/* ===== DOCUMENTS ===== */}
              {tab === 'documents' && (
                <div className="space-y-2">
                  {media.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun document partagé dans cette discussion.
                    </p>
                  ) : (
                    media.documents.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                      >
                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.attachmentName ?? 'Document'}</p>
                          {m.attachmentSize != null && (
                            <p className="text-[11px] text-muted-foreground">
                              {(m.attachmentSize / (1024 * 1024)).toFixed(1)} Mo
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => downloadUrl(m.attachmentUrl ?? '', m.attachmentName)}
                          className="p-1.5 rounded-full hover:bg-background transition-colors"
                          aria-label="Télécharger"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ===== THEME ===== */}
              {tab === 'theme' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground mb-2">
                    Personnalisez la couleur de vos bulles pour cette discussion uniquement.
                  </p>
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => applyTheme(t.key)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                        themeKey === t.key ? 'border-sky-500 bg-sky-50' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <span className={cn('h-6 w-10 rounded-md shrink-0', t.sent)} />
                      <span className="font-medium">{t.label}</span>
                      {themeKey === t.key && (
                        <span className="ml-auto text-xs text-sky-600 font-semibold">Actif</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ===== Confirmation : bloquer ===== */}
      <Dialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Bloquer {other?.firstName} ?</DialogTitle>
            <DialogDescription>
              Cette personne ne pourra plus vous envoyer de messages ni d'invitations.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmBlock(false)}>
              Annuler
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={isBusy} onClick={handleBlock}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bloquer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Confirmation : supprimer ===== */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Supprimer cette conversation ?</DialogTitle>
            <DialogDescription>
              Elle sera retirée de votre liste. Les autres participants la conservent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" disabled={isBusy} onClick={handleDelete}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Visionneuse d'image ===== */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
}

/** Utilitaire réutilisable : applique le thème d'une conversation aux classes des bulles. */
export function chatThemeClasses(conversationId: string): { sent: string; sentHover: string } {
  const key = typeof window !== 'undefined' ? themeKeyFor(conversationId) : 'default';
  const t = THEME_PRESETS.find((x) => x.key === key) ?? THEME_PRESETS[0];
  return { sent: t.sent, sentHover: t.sentHover };
}
