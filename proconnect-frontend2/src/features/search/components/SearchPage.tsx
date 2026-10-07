'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store';
import { profilesApi, jobsApi } from '@/lib/api-services';
import type { ProfileSummary, Job } from '@/types';
import { Search, X, Clock, Users, Briefcase, MapPin, ArrowRight } from 'lucide-react';
import { PresenceAvatar } from '@/components/ui/online-indicator';
import { usePresence } from '@/hooks/use-presence';

type SearchTab = 'all' | 'people' | 'jobs';

const searchTabs: { key: SearchTab; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'people', label: 'Personnes' },
  { key: 'jobs', label: 'Emplois' },
];

function PeopleResults({ profiles, searchQuery, persistRecent }: { profiles: ProfileSummary[]; searchQuery: string; persistRecent: (q: string) => void }) {
  const onlineFlags = usePresence(profiles.map((p) => p.userId));
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {profiles.map((p, index) => (
          <div
            key={p.id}
            onClick={() => persistRecent(searchQuery.trim())}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <PresenceAvatar online={onlineFlags[index] || p.online === true} indicatorSize="sm" ring="ring-white">
              <Avatar className="h-10 w-10">
                {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.fullName} />}
                <AvatarFallback className="bg-sky-100 text-sky-900 text-xs">
                  {p.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </PresenceAvatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {highlightMatch(p.fullName, searchQuery)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {highlightMatch(p.jobTitle ?? p.email, searchQuery)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-sky-200/60 text-sky-900 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchPage() {
  const { searchQuery, setSearchQuery, setIsSearchOpen } = useSearchStore();
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Charger les recherches récentes (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pc_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      /* silencieux */
    }
  }, []);

  // Recherche réelle (debounce) — profils + emplois
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setProfiles([]);
      setJobs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      const [profileRes, jobRes] = await Promise.allSettled([
        profilesApi.search(q, 0, 20),
        jobsApi.list(0, 50),
      ]);
      setProfiles(profileRes.status === 'fulfilled' ? profileRes.value.results : []);
      const allJobs = jobRes.status === 'fulfilled' ? jobRes.value.results : [];
      const ql = q.toLowerCase();
      setJobs(
        allJobs.filter(
          (j) =>
            j.title.toLowerCase().includes(ql) ||
            j.company.toLowerCase().includes(ql) ||
            (j.description ?? '').toLowerCase().includes(ql)
        )
      );
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isQuerying = searchQuery.trim().length >= 2;

  const totalResults = profiles.length + jobs.length;

  const handleSearch = (value: string) => setSearchQuery(value);

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const persistRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 5);
      try {
        localStorage.setItem('pc_recent_searches', JSON.stringify(next));
      } catch {
        /* silencieux */
      }
      return next;
    });
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      try {
        localStorage.setItem('pc_recent_searches', JSON.stringify(next));
      } catch {
        /* silencieux */
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Champ de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher des personnes, emplois..."
          className="w-full h-12 pl-11 pr-10 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-800 focus-visible:ring-offset-1 transition-shadow"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isQuerying ? (
        /* Recherches récentes */
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Recherches récentes</h2>
          {recentSearches.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-sky-800" />
              </div>
              <p className="text-sm text-muted-foreground">Aucune recherche récente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentSearches.map((term) => (
                <div
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground">{term}</span>
                  <button
                    onClick={(e) => handleRemoveRecent(e, term)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                    aria-label={`Supprimer ${term}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Résultats */
        <div className="space-y-3">
          {/* Onglets */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {searchTabs.map((tab) => {
              const count =
                tab.key === 'all'
                  ? totalResults
                  : tab.key === 'people'
                    ? profiles.length
                    : jobs.length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                    activeTab === tab.key
                      ? 'bg-background text-sky-800 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5',
                        activeTab === tab.key
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <div className="flex flex-col items-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                <Search className="h-7 w-7 text-sky-800" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Aucun résultat pour &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Essayez avec d&apos;autres mots-clés
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                {/* Personnes */}
                {(activeTab === 'all' || activeTab === 'people') && profiles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Personnes ({profiles.length})
                    </h3>
                    <PeopleResults profiles={profiles} searchQuery={searchQuery} persistRecent={persistRecent} />
                  </div>
                )}

                {/* Emplois */}
                {(activeTab === 'all' || activeTab === 'jobs') && jobs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Emplois ({jobs.length})
                    </h3>
                    <Card>
                      <CardContent className="p-0 divide-y">
                        {jobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => persistRecent(searchQuery.trim())}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                              <Briefcase className="h-4 w-4 text-sky-800" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {highlightMatch(job.title, searchQuery)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {highlightMatch(job.company, searchQuery)}
                              </p>
                            </div>
                            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
