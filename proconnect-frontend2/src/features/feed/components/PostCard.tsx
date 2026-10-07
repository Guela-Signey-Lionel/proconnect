'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  EyeOff,
  Flag,
  Link as LinkIcon,
  Copy,
  FileText,
  Image as ImageIcon,
  Trash2,
  Pencil,
} from 'lucide-react';
import { cn, timeAgo, getInitials, formatNumber } from '@/lib/utils';
import { useFeedStore, useNavigationStore, useAuthStore, usePreferencesStore } from '@/store';
import { playSound } from '@/lib/sounds';
import { feedApi } from '@/lib/api-services';
import { authorToUser } from '@/lib/api-mappers';
import { PresenceAvatar } from '@/components/ui/online-indicator';
import { useIsOnline } from '@/hooks/use-presence';
import { CommentSection } from './CommentSection';
import { CreatePostModal } from './CreatePostModal';
import { ImageLightbox } from '@/features/messaging/components/ImageLightbox';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const toggleSave = useFeedStore((s) => s.toggleSave);
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const currentUser = useAuthStore((s) => s.currentUser);
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const soundPreset = usePreferencesStore((s) => s.soundPreset);
  const soundVolume = usePreferencesStore((s) => s.soundVolume);
  const soundForLike = usePreferencesStore((s) => s.soundForLike);
  const [showComments, setShowComments] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const author = authorToUser(post.author);
  const isOwnPost = currentUser?.id === post.author.id;
  // Pastille verte : priorité au flag `online` de l'auteur, sinon le store de présence.
  const presenceOnline = useIsOnline(author.id);
  const isOnline = post.author.online ?? presenceOnline;
  // « modifié » si updatedAt est postérieur de plus d'une minute à createdAt.
  const wasEdited =
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 60_000;

  const handleDelete = async () => {
    try {
      await feedApi.delete(post.id);
      useFeedStore.setState((s) => ({ posts: s.posts.filter((p) => p.id !== post.id) }));
    } catch {
      /* silencieux */
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <button
            onClick={() => navigateTo('profile')}
            className="flex items-center gap-3 group/avatar hover:opacity-80 transition-opacity"
          >
            <PresenceAvatar online={isOnline} indicatorSize="md" ring="ring-white">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-semibold">
                  {getInitials(author.firstName, author.lastName)}
                </AvatarFallback>
              </Avatar>
            </PresenceAvatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground group-hover/avatar:text-sky-600 transition-colors leading-tight">
                {author.firstName} {author.lastName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-[300px]">
                {author.email}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {timeAgo(post.createdAt)}
                {wasEdited && ' · modifié'}
              </p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Plus d'options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="gap-2 text-sm cursor-pointer"
                onClick={() => toggleSave(post.id)}
              >
                <Bookmark className="h-4 w-4" />
                {post.isSaved ? 'Retirer des favoris' : 'Enregistrer la publication'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-sm cursor-pointer"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <Copy className="h-4 w-4" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                {copiedLink ? 'Lien copié !' : 'Copier le lien'}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                <EyeOff className="h-4 w-4" />
                Masquer cette publication
              </DropdownMenuItem>
              {isOwnPost && (
                <DropdownMenuItem
                  className="gap-2 text-sm cursor-pointer"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
              )}
              {isOwnPost && (
                <DropdownMenuItem
                  className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive">
                <Flag className="h-4 w-4" />
                Signaler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="pb-3 space-y-3">
        {post.content && (
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </div>
        )}
        {post.attachments.length > 0 && (
          <div className="space-y-2">
            {post.attachments.map((att) =>
              att.attachmentType === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={att.id}
                  src={`${att.fileUrl}`}
                  alt={att.fileName}
                  // Image pleine largeur : couvre tout le champ de la publication.
                  className="rounded-lg border border-border w-full object-cover cursor-zoom-in"
                  onClick={() => setLightboxSrc(att.fileUrl)}
                />
              ) : att.attachmentType === 'VIDEO' ? (
                <video
                  key={att.id}
                  src={att.fileUrl}
                  controls
                  className="rounded-lg border border-border max-h-96 w-full bg-black"
                />
              ) : (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 hover:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{att.fileName}</span>
                </a>
              )
            )}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <Separator />
      <CardFooter className="px-4 py-1.5 flex-col items-stretch gap-0">
        {/* Stats row */}
        <div className="flex items-center justify-between w-full px-1 py-1.5">
          <div className="flex items-center gap-1.5">
            {post.likesCount > 0 && (
              <>
                <div className="flex -space-x-0.5">
                  <div className="h-4 w-4 rounded-full bg-sky-100 flex items-center justify-center">
                    <ThumbsUp className="h-2.5 w-2.5 text-sky-600" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {formatNumber(post.likesCount)}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {post.commentsCount > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-xs text-muted-foreground hover:text-sky-500 font-medium transition-colors"
              >
                {formatNumber(post.commentsCount)} commentaires
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex items-center w-full py-0.5">
          <Button
            variant="ghost"
            onClick={() => {
              toggleLike(post.id);
              if (soundEnabled && soundForLike) playSound('like', soundPreset, soundVolume);
            }}
            className={cn(
              'flex-1 h-9 rounded-lg gap-2 text-sm font-medium transition-all',
              post.likedByMe
                ? 'text-sky-800 hover:text-sky-900 hover:bg-sky-50'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <ThumbsUp
              className={cn(
                'h-[18px] w-[18px] transition-transform',
                post.likedByMe && 'fill-sky-800 text-sky-800'
              )}
            />
            <span className="hidden sm:inline">J&apos;aime</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowComments(!showComments)}
            className={cn(
              'flex-1 h-9 rounded-lg gap-2 text-sm font-medium transition-all',
              showComments
                ? 'text-sky-800 hover:text-sky-900 hover:bg-sky-50'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <MessageCircle className={cn('h-[18px] w-[18px]', showComments && 'fill-sky-500 text-sky-500')} />
            <span className="hidden sm:inline">Commenter</span>
          </Button>

          <Button
            variant="ghost"
            className="flex-1 h-9 rounded-lg gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Share2 className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Partager</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => toggleSave(post.id)}
            className={cn(
              'h-9 w-9 rounded-lg transition-all',
              post.isSaved
                ? 'text-sky-600 hover:text-sky-700 hover:bg-sky-50'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            aria-label={post.isSaved ? 'Retirer des favoris' : 'Enregistrer'}
          >
            {post.isSaved ? (
              <BookmarkCheck className="h-[18px] w-[18px] fill-sky-500 text-sky-500" />
            ) : (
              <Bookmark className="h-[18px] w-[18px]" />
            )}
          </Button>
        </div>

        {/* Comment section */}
        {showComments && (
          <div className="w-full pt-2">
            <CommentSection postId={post.id} commentsCount={post.commentsCount} />
          </div>
        )}
      </CardFooter>

      {/* Edit modal (mode édition de la publication) */}
      <CreatePostModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editPost={post}
      />

      {/* Visionneuse d'image */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={post.content ?? 'Image'}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </Card>
  );
}
