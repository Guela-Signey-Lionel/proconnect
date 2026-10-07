'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Calendar, FolderOpen, Megaphone } from 'lucide-react';
import { getInitials, formatNumber } from '@/lib/utils';
import { useAuthStore, useNavigationStore } from '@/store';
import { profilesApi, connectionsApi, communityApi } from '@/lib/api-services';
import type { ProfileSummary } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PresenceAvatar } from '@/components/ui/online-indicator';
import { usePresence } from '@/hooks/use-presence';

interface EventItem {
  id: string;
  title: string;
  startsAt?: string;
}

/** Ligne de suggestion avec pastille verte si l'utilisateur est en ligne. */
function SuggestionRow({
  person,
  invited,
  isPending,
  onInvite,
}: {
  person: ProfileSummary;
  invited: boolean;
  isPending: boolean;
  onInvite: (p: ProfileSummary) => void;
}) {
  const [firstName, ...rest] = person.fullName.split(' ');
  const lastName = rest.join(' ');
  const onlineFlags = usePresence([person.userId]);
  const isOnline = onlineFlags[0] || person.online === true;

  return (
    <li className="flex items-center gap-3">
      <PresenceAvatar online={isOnline} indicatorSize="sm" ring="ring-white">
        <Avatar className="size-10">
          {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt={person.fullName} />}
          <AvatarFallback className="bg-sky-50 text-sky-800 text-xs font-semibold">
            {getInitials(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
      </PresenceAvatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{person.fullName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {person.jobTitle ?? person.department ?? ''}
        </p>
      </div>
      <Button
        size="sm"
        variant={invited ? 'ghost' : 'outline'}
        className="shrink-0 text-xs h-7 px-2.5 text-sky-800"
        disabled={invited || isPending}
        onClick={() => onInvite(person)}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : invited ? <Check className="h-3.5 w-3.5" /> : '+'}
      </Button>
    </li>
  );
}

export function RightSidebar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const [suggested, setSuggested] = useState<ProfileSummary[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    // Suggestions : uniquement les personnes avec qui je n'ai AUCUNE relation
    // (ni connexion acceptée, ni invitation en attente dans un sens ou l'autre).
    // Répertoire complet : chaque compte créé y figure automatiquement.
    Promise.all([
      profilesApi.directory(),
      connectionsApi.list('PENDING'),
      connectionsApi.list('ACCEPTED'),
    ])
      .then(([directory, pending, accepted]) => {
        const related = new Set<string>([currentUser.id]);
        for (const c of [...pending, ...accepted]) {
          related.add(c.requester.id);
          related.add(c.addressee.id);
        }
        setSuggested(directory.filter((p) => !related.has(p.userId)).slice(0, 3));
      })
      .catch(() => setSuggested([]));
    // Annonces : événements à venir de la communauté
    communityApi
      .events(0, 3)
      .then((page) => setEvents(page.results as EventItem[]))
      .catch(() => setEvents([]));
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const handleInvite = async (profile: ProfileSummary) => {
    setPendingId(profile.id);
    try {
      await connectionsApi.send(profile.userId);
      setInvitedIds((prev) => new Set(prev).add(profile.id));
      toast({ title: 'Invitation envoyée' });
    } catch (e) {
      toast({ title: 'Impossible d\'envoyer l\'invitation', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <aside className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-0 h-screen overflow-hidden">
      <ScrollArea className="h-full py-4 px-3">
        <div className="space-y-4">
          {/* Mini profil */}
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  {currentUser.avatar ? (
                    <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
                  ) : null}
                  <AvatarFallback className="bg-sky-100 text-sky-800 text-sm font-semibold">
                    {getInitials(currentUser.firstName, currentUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <button
                    onClick={() => navigateTo('profile')}
                    className="text-sm font-semibold hover:text-sky-800 transition-colors truncate block text-left"
                  >
                    {currentUser.firstName} {currentUser.lastName}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">{currentUser.headline}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
                <button
                  onClick={() => navigateTo('profile')}
                  className="text-sky-800 hover:text-sky-900 font-medium"
                >
                  Voir le profil
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Accès rapide */}
          <Card className="py-4">
            <CardHeader className="px-4 pb-2 pt-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-sky-800" />
                Accès rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Documents partagés', icon: <FolderOpen className="size-4" />, page: 'feed' as const },
                  { label: 'Annonces', icon: <Megaphone className="size-4" />, page: 'notifications' as const },
                  { label: 'Paramètres', icon: <Building2 className="size-4" />, page: 'settings' as const },
                ].map((link) => (
                  <button
                    key={link.label}
                    onClick={() => navigateTo(link.page)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-sky-50 hover:text-sky-900 transition-colors text-left"
                  >
                    <span className="text-gray-400">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Annonces / événements */}
          {events.length > 0 && (
            <Card className="py-4">
              <CardHeader className="px-4 pb-0 pt-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="size-4 text-sky-800" />
                  Annonces & événements
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <ul className="space-y-3">
                  {events.map((event) => (
                    <li key={event.id} className="group">
                      <p className="text-sm font-medium hover:text-sky-800 transition-colors text-left">
                        {event.title}
                      </p>
                      {event.startsAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(event.startsAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions de connexions */}
          <Card className="py-4">
            <CardHeader className="px-4 pb-0 pt-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-sky-800" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {suggested.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Aucune suggestion pour le moment.</p>
              ) : (
                <ul className="space-y-3">
                  {suggested.map((person) => (
                    <SuggestionRow
                      key={person.id}
                      person={person}
                      invited={invitedIds.has(person.id)}
                      isPending={pendingId === person.id}
                      onInvite={handleInvite}
                    />
                  ))}
                </ul>
              )}
              <Button
                variant="link"
                className="mt-3 h-auto p-0 text-sky-800 text-xs"
                onClick={() => navigateTo('network')}
              >
                Voir tous les collaborateurs
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="px-1 pb-4">
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <button className="hover:underline hover:text-foreground transition-colors">À propos</button>
              <span>·</span>
              <button className="hover:underline hover:text-foreground transition-colors">Confidentialité</button>
              <span>·</span>
              <button className="hover:underline hover:text-foreground transition-colors">Centre d'aide</button>
              <span>·</span>
              <button className="hover:underline hover:text-foreground transition-colors">
                Politique de sécurité
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              ProConnect © 2026 — Réseau professionnel d'entreprise
            </p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
