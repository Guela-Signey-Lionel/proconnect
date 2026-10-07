'use client';

import { ConnectionCard } from './ConnectionCard';
import { Sparkles } from 'lucide-react';
import type { UiConnection } from './ConnectionCard';

interface ConnectionSuggestionsProps {
  connections: UiConnection[];
  onConnect?: (id: string) => void;
}

export function ConnectionSuggestions({ connections, onConnect }: ConnectionSuggestionsProps) {
  if (connections.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
          <Sparkles className="h-7 w-7 text-sky-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucune suggestion</p>
        <p className="text-xs text-muted-foreground mt-1">
          Nous n'avons pas de nouvelles suggestions pour le moment.
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
          onConnect={onConnect}
        />
      ))}
    </div>
  );
}
