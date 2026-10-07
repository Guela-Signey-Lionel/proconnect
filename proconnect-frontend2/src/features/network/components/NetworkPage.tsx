'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Connection, ProfileSummary, User } from '@/types';
import { ConnectionCard, type UiConnection } from './ConnectionCard';
import { PendingRequests } from './PendingRequests';
import { ConnectionSuggestions } from './ConnectionSuggestions';
import { Users, UserRoundPlus, Sparkles, Search, Inbox, RefreshCw } from 'lucide-react';
import { useAuthStore, useMessagingStore, useNavigationStore } from '@/store';
import { connectionsApi, profilesApi, messagingApi } from '@/lib/api-services';
import { splitName } from '@/lib/api-mappers';
import { onNotification } from '@/lib/realtime';
import { toast } from '@/hooks/use-toast';

/** Convertit une Connection backend en modèle UI (user = l'AUTRE personne). */
function toUiConnection(c: Connection, currentUserId: string): UiConnection {
  const other = c.requester.id === currentUserId ? c.addressee : c.requester;
  const { firstName, lastName } = splitName(`${other.firstName} ${other.lastName}`);
  const uiUser: UiConnection['user'] = {
    id: other.id,
    firstName: other.firstName || firstName,
    lastName: other.lastName || lastName,
    email: other.email,
    headline: other.headline,
    avatar: other.avatar,
  };
  let status: 'connected' | 'pending_sent' | 'pending_received' | 'suggested';
  switch (c.status) {
    case 'ACCEPTED':
      status = 'connected';
      break;
    case 'PENDING':
      status = c.requester.id === currentUserId ? 'pending_sent' : 'pending_received';
      break;
    default:
      status = 'suggested';
  }
  return { id: c.id, user: uiUser, mutualConnections: 0, status: status as UiConnection['status'] };
}

export function NetworkPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('connections');

  const load = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pending, accepted, profiles] = await Promise.all([
        connectionsApi.list('PENDING'),
        connectionsApi.list('ACCEPTED'),
        // Répertoire complet : chaque compte créé apparaît dans les suggestions,
        // même si la recherche paginée l'aurait omis.
        profilesApi.directory(),
      ]);
      // Dédupe : PENDING + ACCEPTED suffisent (all peut renvoyer d'autres statuts).
      const seen = new Set<string>();
      const merged: Connection[] = [];
      for (const c of [...pending, ...accepted]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      setConnections(merged);
      // Suggestions : tous les profils sauf moi et ceux déjà en relation.
      const known = new Set<string>([currentUser.id]);
      merged.forEach((c) => {
        known.add(c.requester.id);
        known.add(c.addressee.id);
      });
      const suggestions: User[] = profiles
        .filter((p: ProfileSummary) => !known.has(p.userId))
        .map((p: ProfileSummary) => {
          const u = splitName(p.fullName);
          return {
            id: p.userId,
            firstName: u.firstName,
            lastName: u.lastName,
            email: p.email,
            avatar: p.avatarUrl,
            headline: p.jobTitle ?? undefined,
          };
        });
      setSuggestedUsers(suggestions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Rechargement léger (sans spinners) quand une invitation arrive en temps réel.
  const refreshSilently = useCallback(async () => {
    try {
      const [pending, accepted] = await Promise.all([
        connectionsApi.list('PENDING'),
        connectionsApi.list('ACCEPTED'),
      ]);
      const seen = new Set<string>();
      const merged: Connection[] = [];
      for (const c of [...pending, ...accepted]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      setConnections(merged);
      // Une personne avec qui une relation existe (même en attente) ne doit plus
      // apparaître dans les suggestions — elle est dans Réseau / Invitations.
      setSuggestedUsers((prev) =>
        prev.filter(
          (u) => !merged.some((c) => c.requester.id === u.id || c.addressee.id === u.id)
        )
      );
    } catch {
      /* silencieux */
    }
  }, []);

  // Temps réel : une CONNECTION_REQUEST/ACCEPTED pushée par STOMP → rafraîchit la liste.
  useEffect(() => {
    if (!currentUser) return;
    return onNotification((n) => {
      if (n?.notificationType === 'CONNECTION_REQUEST' || n?.notificationType === 'CONNECTION_ACCEPTED') {
        refreshSilently();
      }
    });
  }, [currentUser, refreshSilently]);

  // Filet de sécurité : polling léger toutes les 15 s (si le WebSocket est en panne).
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(refreshSilently, 15000);
    return () => clearInterval(interval);
  }, [currentUser, refreshSilently]);

  const uiConnections = useMemo(
    () =>
      connections
        .map((c) => (currentUser ? toUiConnection(c, currentUser.id) : null))
        .filter((c): c is UiConnection => c !== null),
    [connections, currentUser]
  );

  const filterByName = (list: typeof uiConnections) =>
    searchQuery === ''
      ? list
      : list.filter((c) =>
          `${c.user.firstName} ${c.user.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        );

  const connectedConnections = useMemo(
    () => filterByName(uiConnections.filter((c) => c.status === 'connected')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uiConnections, searchQuery]
  );
  const pendingReceived = useMemo(
    () => filterByName(uiConnections.filter((c) => c.status === 'pending_received')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uiConnections, searchQuery]
  );

  const suggestedUi = useMemo(
    () =>
      suggestedUsers
        .filter(
          (u) =>
            searchQuery === '' ||
            `${u.firstName} ${u.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
        )
        .map((u) => ({
          id: `sugg-${u.id}`,
          user: {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            headline: u.headline,
          },
          mutualConnections: 0,
          status: 'suggested' as const,
        })),
    [suggestedUsers, searchQuery]
  );

  const totalConnections = uiConnections.filter((c) => c.status === 'connected').length;
  const pendingCount = uiConnections.filter((c) => c.status === 'pending_received').length;

  const handleAccept = useCallback(async (id: string) => {
    try {
      await connectionsApi.accept(id);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'ACCEPTED' as const } : c))
      );
      toast({ title: 'Invitation acceptée' });
    } catch (e) {
      // On rafraîchit quand même : l'acceptation a peut-être déjà eu lieu (double-clic,
      // autre onglet) et le backend renvoie alors 400 « n'est plus en attente ».
      toast({ title: 'Impossible d\'accepter', description: (e as Error).message, variant: 'destructive' });
      refreshSilently();
    }
  }, [refreshSilently]);

  const handleRefuse = useCallback(async (id: string) => {
    try {
      await connectionsApi.reject(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast({ title: 'Impossible de refuser', description: (e as Error).message, variant: 'destructive' });
    }
  }, []);

  const handleConnect = useCallback(async (id: string) => {
    // id de suggestion = "sugg-<userId>"
    const userId = id.replace(/^sugg-/, '');
    try {
      const created = await connectionsApi.send(userId);
      setConnections((prev) => [...prev, created]);
      setSuggestedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({ title: 'Invitation envoyée' });
    } catch (e) {
      toast({ title: 'Impossible d\'envoyer l\'invitation', description: (e as Error).message, variant: 'destructive' });
    }
  }, []);

  /** Ouvre (ou crée) la conversation directe puis bascule sur la messagerie. */
  const handleMessage = useCallback(async (userId: string) => {
    const existing = useMessagingStore.getState().conversations.find(
      (c) => !c.isGroup && c.participants.some((p) => p.id === userId)
    );
    if (existing) {
      await useMessagingStore.getState().openConversation(existing.id);
    } else {
      await useMessagingStore.getState().startDirect(userId);
    }
    useNavigationStore.getState().navigateTo('messaging');
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mon Réseau</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez vos connexions et développez votre réseau professionnel
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-sky-100 bg-sky-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-sky-800" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-900">{totalConnections}</p>
              <p className="text-xs text-muted-foreground">Connexions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-100 bg-sky-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
              <UserRoundPlus className="h-5 w-5 text-sky-800" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-900">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Invitations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto flex-row bg-muted/50 p-1 rounded-lg">
          <TabsTrigger
            value="connections"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-sky-800 data-[state=active]:shadow-sm text-xs sm:text-sm"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Mes connexions</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px] bg-white/80 text-muted-foreground data-[state=active]:bg-sky-50 data-[state=active]:text-sky-600"
            >
              {totalConnections}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-sky-800 data-[state=active]:shadow-sm text-xs sm:text-sm"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Invitations</span>
            {pendingCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-sky-900 text-white">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="suggestions"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-sky-800 data-[state=active]:shadow-sm text-xs sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Suggestions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : connectedConnections.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                <Users className="h-7 w-7 text-sky-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? 'Aucun résultat' : 'Aucune connexion'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? 'Essayez un autre terme de recherche.'
                  : 'Invitez des collaborateurs depuis l’onglet Suggestions.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <PendingRequests
            connections={pendingReceived}
            onAccept={handleAccept}
            onRefuse={handleRefuse}
          />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <ConnectionSuggestions
            connections={suggestedUi}
            onConnect={handleConnect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
