'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { timeAgo, getInitials, formatNumber } from '@/lib/utils';
import { useAuthStore, useFeedStore } from '@/store';
import { feedApi } from '@/lib/api-services';
import { authorToUser } from '@/lib/api-mappers';
import type { Comment } from '@/types';

interface CommentSectionProps {
  postId: string;
  commentsCount: number;
}

export function CommentSection({ postId, commentsCount }: CommentSectionProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const addComment = useFeedStore((s) => s.addComment);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = await feedApi.listComments(postId);
      setComments(page.results);
    } catch {
      /* silencieux */
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!commentText.trim() || !currentUser || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment(postId, commentText.trim());
      setCommentText('');
      await load();
    } catch {
      /* silencieux */
    } finally {
      setIsSubmitting(false);
    }
  };

  const CommentInput = () => (
    <div className="flex gap-2 items-start">
      {currentUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-semibold">
            {getInitials(currentUser.firstName, currentUser.lastName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Ajouter un commentaire..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
        />
        {commentText.trim() && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="icon"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-sky-500 hover:bg-sky-600 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="pt-2 border-t border-border/50">
      {/* Comments list */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2">Chargement des commentaires…</p>
        ) : (
          comments.map((comment) => {
            const author = authorToUser(comment.author);
            return (
              <div key={comment.id} className="flex gap-2 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-semibold">
                    {getInitials(author.firstName, author.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <p className="text-sm font-semibold leading-tight">
                      {author.firstName} {author.lastName}
                    </p>
                    <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                      {comment.content ?? comment.sticker ?? ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-3">
                    {currentUser?.id === comment.author.id && (
                      <button
                        onClick={async () => {
                          try {
                            await feedApi.deleteComment(comment.id);
                            setComments((cs) => cs.filter((c) => c.id !== comment.id));
                            useFeedStore.setState((s) => ({
                              posts: s.posts.map((p) =>
                                p.id === postId
                                  ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
                                  : p
                              ),
                            }));
                          } catch {
                            /* silencieux */
                          }
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Supprimer
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {comments.length === 0 && !isLoading && commentsCount > 0 && (
        <p className="text-xs text-muted-foreground py-2">Aucun commentaire pour le moment.</p>
      )}

      {/* Comment input */}
      <div className="mt-2">
        <CommentInput />
      </div>
    </div>
  );
}
