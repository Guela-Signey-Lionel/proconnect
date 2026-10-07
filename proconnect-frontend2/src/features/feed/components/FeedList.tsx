'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Smile, MapPin, Hash, PenSquare } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useAuthStore, useFeedStore } from '@/store';
import { CreatePostModal } from './CreatePostModal';
import { FeedFilter } from './FeedFilter';
import { PostCard } from './PostCard';

function PostCardSkeleton() {
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="border-t border-border/60" />
      <div className="px-4 py-2.5 flex items-center">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </Card>
  );
}

export function FeedList() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const posts = useFeedStore((s) => s.posts);
  const isLoading = useFeedStore((s) => s.isLoading);
  const error = useFeedStore((s) => s.error);
  const loadPosts = useFeedStore((s) => s.loadPosts);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <div className="space-y-4">
      {/* Create post prompt */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 w-full group cursor-pointer"
          >
            {currentUser && (
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-semibold">
                  {getInitials(currentUser.firstName, currentUser.lastName)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 h-11 rounded-full border border-border bg-muted/40 px-4 flex items-center text-left group-hover:border-sky-300 group-hover:bg-sky-50/50 transition-all">
              <span className="text-sm text-muted-foreground">
                De quoi souhaitez-vous parler ?
              </span>
            </div>
          </button>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="text-muted-foreground hover:text-sky-600 hover:bg-sky-50 gap-1.5 rounded-lg h-8 text-xs font-medium"
              >
                <ImageIcon className="h-4 w-4 text-sky-500" />
                <span className="hidden sm:inline">Média</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="text-muted-foreground hover:text-sky-600 hover:bg-sky-50 gap-1.5 rounded-lg h-8 text-xs font-medium"
              >
                <Smile className="h-4 w-4 text-sky-500" />
                <span className="hidden sm:inline">Émoji</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="text-muted-foreground hover:text-sky-600 hover:bg-sky-50 gap-1.5 rounded-lg h-8 text-xs font-medium"
              >
                <MapPin className="h-4 w-4 text-sky-500" />
                <span className="hidden sm:inline">Localisation</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="text-muted-foreground hover:text-sky-600 hover:bg-sky-50 gap-1.5 rounded-lg h-8 text-xs font-medium"
              >
                <Hash className="h-4 w-4 text-sky-500" />
                <span className="hidden sm:inline">Sujet</span>
              </Button>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-4 h-8 text-xs font-semibold gap-1.5 transition-colors"
            >
              <PenSquare className="h-3.5 w-3.5" />
              Publier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <FeedFilter />

      {/* Posts list */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : error ? (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-8 text-center">
              <h3 className="text-base font-semibold text-foreground">Erreur de chargement</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button
                onClick={() => loadPosts()}
                className="mt-4 bg-sky-500 hover:bg-sky-600 text-white rounded-full px-5 font-semibold transition-colors"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
                <PenSquare className="h-8 w-8 text-sky-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Aucune publication
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Soyez le premier à partager quelque chose avec votre réseau !
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-sky-500 hover:bg-sky-600 text-white rounded-full px-5 font-semibold transition-colors"
              >
                Créer une publication
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create post modal */}
      <CreatePostModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}
