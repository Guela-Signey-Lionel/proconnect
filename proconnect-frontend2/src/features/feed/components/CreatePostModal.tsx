'use client';

/**
 * Composer de publication :
 * - joint des images, vidéos, documents (upload vers le backend) et insère des stickers/emojis ;
 * - prévisualisation des médias avant publication ;
 * - mode édition d'une publication déjà publiée (texte + retrait/ajout de médias).
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  ImageIcon,
  Smile,
  MapPin,
  Hash,
  Loader2,
  Video,
  FileText,
  X,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useFeedStore } from '@/store';
import { feedApi } from '@/lib/api-services';
import { toast } from '@/hooks/use-toast';
import type { Post, PostAttachment } from '@/types';

const MAX_CHARS = 700;
/** Limites alignées sur proconnect.uploads.* (application.yml). */
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 100;
const MAX_DOCUMENT_MB = 20;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Publication à modifier (mode édition si fourni). */
  editPost?: Post | null;
}

function validateFile(file: File): string | null {
  if (file.type.startsWith('image/') && file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `« ${file.name} » dépasse ${MAX_IMAGE_MB} Mo (image).`;
  }
  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return `« ${file.name} » dépasse ${MAX_VIDEO_MB} Mo (vidéo).`;
  }
  if (
    !file.type.startsWith('image/') &&
    !file.type.startsWith('video/') &&
    file.size > MAX_DOCUMENT_MB * 1024 * 1024
  ) {
    return `« ${file.name} » dépasse ${MAX_DOCUMENT_MB} Mo (document).`;
  }
  return null;
}

export function CreatePostModal({ open, onOpenChange, editPost }: CreatePostModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const createPost = useFeedStore((s) => s.createPost);
  const updatePost = useFeedStore((s) => s.updatePost);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  /** Pièces jointes existantes marquées pour retrait (mode édition). */
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!editPost;

  // Préremplissage en mode édition.
  useEffect(() => {
    if (open) {
      setContent(editPost?.content ?? '');
      setFiles([]);
      setRemovedIds(new Set());
      setIsSubmitting(false);
      setShowEmojiPanel(false);
    }
  }, [open, editPost]);

  // Révocation des URLs de prévisualisation.
  const previewUrls = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files]
  );
  useEffect(() => {
    return () => {
      previewUrls.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previewUrls]);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasMedia = files.length > 0 || (editPost?.attachments.length ?? 0) > removedIds.size;
  const canPost = (content.trim().length > 0 || hasMedia) && !isOverLimit && !isSubmitting;

  const resetAndClose = useCallback(() => {
    setContent('');
    setFiles([]);
    setRemovedIds(new Set());
    setIsSubmitting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];
    for (const f of Array.from(incoming)) {
      const error = validateFile(f);
      if (error) {
        toast({ title: 'Fichier refusé', description: error, variant: 'destructive' });
      } else {
        accepted.push(f);
      }
    }
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const toggleRemoveAttachment = (attachmentId: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(attachmentId)) next.delete(attachmentId);
      else next.add(attachmentId);
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!canPost || !currentUser) return;
    setIsSubmitting(true);
    try {
      if (isEditMode && editPost) {
        // 1) Texte + retrait des médias décochés.
        await updatePost(editPost.id, {
          content: content.trim(),
          removeAttachmentIds: Array.from(removedIds),
        });
        // 2) Ajout des nouveaux médias.
        for (const file of files) {
          await feedApi.addAttachment(editPost.id, file);
        }
        if (files.length > 0) {
          // Resynchronise la publication modifiée depuis le serveur.
          await useFeedStore.getState().loadPosts();
        }
        toast({ title: 'Publication modifiée' });
      } else {
        await createPost(content.trim(), files);
        toast({ title: 'Publication créée' });
      }
      resetAndClose();
    } catch (e) {
      toast({
        title: isEditMode ? 'Modification impossible' : 'Publication impossible',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canPost, currentUser, isEditMode, editPost, content, removedIds, files,
    updatePost, createPost, resetAndClose,
  ]);

  const keptAttachments: PostAttachment[] =
    editPost?.attachments.filter((a) => !removedIds.has(a.id)) ?? [];

  const toolbarButtonClass =
    'h-9 w-9 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-center text-lg font-semibold">
            {isEditMode ? 'Modifier la publication' : 'Créer une publication'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-3">
            {currentUser && (
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={currentUser.avatar ?? undefined} alt={currentUser.firstName} />
                <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-semibold">
                  {getInitials(currentUser.firstName, currentUser.lastName)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {currentUser && (
                <div className="text-sm font-semibold text-foreground leading-tight">
                  {currentUser.firstName} {currentUser.lastName}
                </div>
              )}
              {currentUser && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {currentUser.headline}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3">
            <Textarea
              placeholder="De quoi souhaitez-vous parler ?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn(
                'min-h-[120px] resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0',
                isOverLimit && 'ring-2 ring-destructive rounded-md'
              )}
              maxLength={800}
            />
          </div>

          {/* Pièces jointes existantes (mode édition) */}
          {isEditMode && keptAttachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {keptAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group rounded-lg border border-border overflow-hidden bg-muted/30"
                >
                  {att.attachmentType === 'IMAGE' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={att.fileUrl} alt={att.fileName} className="h-20 w-20 object-cover" />
                  ) : (
                    <div className="h-20 w-20 flex flex-col items-center justify-center gap-1 p-1">
                      {att.attachmentType === 'VIDEO' ? (
                        <Video className="h-5 w-5 text-violet-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-[10px] text-muted-foreground text-center line-clamp-2">
                        {att.fileName}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleRemoveAttachment(att.id)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Retirer ce média de la publication"
                    title="Retirer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Prévisualisation des nouveaux fichiers */}
          {previewUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previewUrls.map(({ file, url }) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="relative group rounded-lg border border-border overflow-hidden bg-muted/30"
                >
                  {file.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={file.name} className="h-20 w-20 object-cover" />
                  ) : file.type.startsWith('video/') ? (
                    <video src={url} className="h-20 w-20 object-cover" muted />
                  ) : (
                    <div className="h-20 w-20 flex flex-col items-center justify-center gap-1 p-1">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="text-[10px] text-muted-foreground text-center line-clamp-2">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((f) => f !== file))}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Retirer ce fichier"
                    title="Retirer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Panneau stickers / emojis (en flux pour rester visible dans la modale) */}
          {showEmojiPanel && (
            <div className="mt-2 flex justify-center rounded-lg border border-border overflow-hidden">
              <EmojiPicker
                onEmojiClick={(data) => {
                  setContent((c) => (c + data.emoji).slice(0, 800));
                }}
                emojiStyle={EmojiStyle.NATIVE}
                theme={Theme.LIGHT}
                searchPlaceholder="Rechercher un sticker…"
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis
                width="100%"
                height={260}
              />
            </div>
          )}

          {/* Character count */}
          <div className="flex items-center justify-between mt-1">
            <div />
            <span
              className={cn(
                'text-xs tabular-nums',
                isOverLimit
                  ? 'text-destructive font-semibold'
                  : charCount > MAX_CHARS * 0.9
                    ? 'text-amber-500'
                    : 'text-muted-foreground'
              )}
            >
              {charCount}/{MAX_CHARS}
            </span>
          </div>

          {/* Action toolbar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={documentInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={toolbarButtonClass}
                onClick={() => imageInputRef.current?.click()}
                aria-label="Ajouter une image"
                title="Image"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={toolbarButtonClass}
                onClick={() => videoInputRef.current?.click()}
                aria-label="Ajouter une vidéo"
                title="Vidéo"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(toolbarButtonClass, showEmojiPanel && 'bg-amber-50 text-amber-500')}
                onClick={() => setShowEmojiPanel((o) => !o)}
                aria-label="Ajouter un sticker / emoji"
                title="Sticker / emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={toolbarButtonClass}
                onClick={() => documentInputRef.current?.click()}
                aria-label="Joindre un document"
                title="Document"
              >
                <FileText className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(toolbarButtonClass, 'hidden sm:inline-flex')}
                aria-label="Ajouter une localisation"
                title="Localisation (bientôt disponible)"
              >
                <MapPin className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(toolbarButtonClass, 'hidden sm:inline-flex')}
                aria-label="Ajouter un hashtag"
                title="Hashtag (bientôt disponible)"
              >
                <Hash className="h-5 w-5" />
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canPost}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-6 font-semibold transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Enregistrement...' : 'Publication...'}
                </>
              ) : isEditMode ? (
                'Enregistrer'
              ) : (
                'Publier'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
