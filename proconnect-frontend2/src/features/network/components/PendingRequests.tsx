'use client';

import { ConnectionCard } from './ConnectionCard';
import { UserRoundPlus } from 'lucide-react';
import type { UiConnection } from './ConnectionCard';

interface PendingRequestsProps {
  connections: UiConnection[];
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
}

export function PendingRequests({ connections, onAccept, onRefuse }: PendingRequestsProps) {
  if (connections.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
          <UserRoundPlus className="h-7 w-7 text-sky-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucune invitation en attente</p>
        <p className="text-xs text-muted-foreground mt-1">
          Vous n'avez pas d'invitations à traiter pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((connection) => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          onAccept={onAccept}
          onRefuse={onRefuse}
        />
      ))}
    </div>
  );
}
