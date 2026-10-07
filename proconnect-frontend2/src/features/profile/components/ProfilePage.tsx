'use client';

import { useEffect, useState, useCallback } from 'react';
import { feedApi } from '@/lib/api-services';
import { useAuthStore } from '@/store';
import { ProfileHeader } from './ProfileHeader';
import { AboutSection } from './AboutSection';
import { ExperienceSection } from './ExperienceSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '@/types';
import { getInitials, timeAgo, formatNumber } from '@/lib/utils';
import { ThumbsUp, MessageCircle, Newspaper } from 'lucide-react';

function RecentActivity() {
  const user = useAuthStore((s) => s.currentUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const page = await feedApi.byAuthor(user.id, 0, 10);
      setPosts(page.results);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Activité récente</h2>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-6">
            <Newspaper className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune publication récente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div key={post.id}>
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-sky-100 text-sky-800 text-xs font-medium">
                      {getInitials(...post.author.fullName.split(/\s+/).slice(0, 2) as [string, string])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">{post.author.fullName}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {formatNumber(post.likesCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.commentsCount}
                      </span>
                    </div>
                  </div>
                </div>
                {index < posts.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  return (
    <div className="space-y-4">
      <ProfileHeader />

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="w-full h-auto p-0 bg-transparent border-b rounded-none gap-0">
          <TabsTrigger
            value="about"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-sm"
          >
            À propos
          </TabsTrigger>
          <TabsTrigger
            value="experience"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-sm"
          >
            Expérience
          </TabsTrigger>
          <TabsTrigger
            value="education"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-sm"
          >
            Formation
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-sm"
          >
            Compétences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-4">
          <AboutSection />
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <ExperienceSection />
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <EducationSection />
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <SkillsSection />
        </TabsContent>
      </Tabs>

      <RecentActivity />
    </div>
  );
}
