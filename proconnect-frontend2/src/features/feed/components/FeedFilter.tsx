'use client';

import { cn } from '@/lib/utils';
import { useFeedStore } from '@/store';
import { Flame, Clock, Users } from 'lucide-react';

type FilterType = 'top' | 'recent' | 'connections';

const FILTERS: { key: FilterType; label: string; icon: React.ElementType }[] = [
  { key: 'top', label: 'Populaire', icon: Flame },
  { key: 'recent', label: 'Récent', icon: Clock },
  { key: 'connections', label: 'Connexions', icon: Users },
];

export function FeedFilter() {
  const filter = useFeedStore((s) => s.filter);
  const setFilter = useFeedStore((s) => s.setFilter);

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
      {FILTERS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex-1 justify-center',
            filter === key
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-pressed={filter === key}
        >
          <Icon className={cn('h-3.5 w-3.5', filter === key && 'text-sky-500')} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
