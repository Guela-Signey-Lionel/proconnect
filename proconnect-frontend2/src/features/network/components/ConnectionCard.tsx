'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import { UserPlus, UserCheck, Check, X, MessageSquare } from 'lucide-react';
import { PresenceAvatar } from '@/components/ui/online-indicator';
import { useIsOnline } from '@/hooks/use-presence';

export interface UiConnection {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    headline?: string;
    avatar?: string | null;
  };
  mutualConnections: number;
  status: 'connected' | 'pending_sent' | 'pending_received' | 'suggested';
}

interface ConnectionCardProps {
  connection: UiConnection;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onConnect?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  /** Ouvre une conversation directe avec l'utilisateur (connexions acceptées). */
  onMessage?: (userId: string) => void;
}

export function ConnectionCard({
  connection,
  onAccept,
  onRefuse,
  onConnect,
  onWithdraw,
  onMessage,
}: ConnectionCardProps) {
  const { user, mutualConnections, status, id } = connection;
  const [localStatus, setLocalStatus] = useState(status);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const isOnline = useIsOnline(user.id);

  const handleAccept = () => {
    setLocalStatus('connected');
    onAccept?.(id);
  };

  const handleRefuse = () => {
    setLocalStatus('suggested');
    onRefuse?.(id);
  };

  const handleConnect = () => {
    setLocalStatus('pending_sent');
    onConnect?.(id);
  };

  const handleWithdraw = () => {
    setLocalStatus('suggested');
    onWithdraw?.(id);
  };

  const handleMessage = async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    try {
      await onMessage?.(user.id);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Avatar + pastille verte si en ligne */}
          <PresenceAvatar online={isOnline} indicatorSize="md" ring="ring-white">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
              {user.avatar && <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />}
              <AvatarFallback className="bg-sky-100 text-sky-800 font-semibold">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
          </PresenceAvatar>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            {user.headline && (
              <p className="text-xs sm:text-sm text-muted-foreground/80 truncate">{user.headline}</p>
            )}
            {mutualConnections > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium text-sky-800">{mutualConnections}</span>{' '}
                {mutualConnections === 1 ? 'connexion en commun' : 'connexions en commun'}
              </p>
            )}
          </div>

          {/* Actions principales */}
          <div className="shrink-0 flex items-center gap-2">
            {localStatus === 'connected' && (
              <Badge
                variant="secondary"
                className="bg-sky-100 text-sky-800 hover:bg-sky-100 font-medium cursor-default"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Connecté</span>
              </Badge>
            )}

            {localStatus === 'pending_sent' && (
              <Button variant="outline" size="sm" disabled className="text-muted-foreground cursor-not-allowed">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                En attente
              </Button>
            )}

            {localStatus === 'pending_received' && (
              <>
                <Button
                  size="sm"
                  onClick={handleRefuse}
                  variant="outline"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Refuser</span>
                </Button>
                <Button size="sm" onClick={handleAccept} className="bg-sky-900 hover:bg-sky-800 text-white">
                  <Check className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Accepter</span>
                </Button>
              </>
            )}

            {localStatus === 'suggested' && (
              <Button size="sm" onClick={handleConnect} className="bg-sky-900 hover:bg-sky-800 text-white">
                <UserPlus className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Se connecter</span>
              </Button>
            )}
          </div>
        </div>

        {/* Bouton message — en bas de la carte, uniquement pour les connexions acceptées */}
        {localStatus === 'connected' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMessage}
            disabled={isStartingChat}
            className="w-full border-sky-200 text-sky-800 hover:bg-sky-50 hover:text-sky-900"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            {isStartingChat ? 'Ouverture de la conversation…' : 'Envoyer un message'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { cn };
