'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { jobsApi } from '@/lib/api-services';
import type { Job } from '@/types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { JobApplicationModal } from './JobApplicationModal';

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationQuery, setLocationQuery] = useState('');
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await jobsApi.list(0, 50);
      setJobs(page.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Types disponibles déduits des données réelles
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.type && set.add(j.type));
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (typeFilter !== 'all' && job.type !== typeFilter) return false;
      if (locationQuery && !job.location.toLowerCase().includes(locationQuery.toLowerCase())) return false;
      return true;
    });
  }, [jobs, searchQuery, typeFilter, locationQuery]);

  const handleApply = useCallback(async (job: Job) => {
    setDetailOpen(false);
    setApplyJob(job);
    setApplyOpen(true);
  }, []);

  const handleApplicationSubmit = useCallback(async (jobId: string) => {
    try {
      const fresh = await jobsApi.apply(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? fresh : j)));
    } catch {
      /* silencieux */
    }
  }, []);

  const handleViewDetail = useCallback((job: Job) => {
    setDetailJob(job);
    setDetailOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Titre */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Emplois</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Trouvez votre prochain poste parmi les meilleures offres
        </p>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par titre ou entreprise..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 rounded-lg"
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9 rounded-lg text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {availableTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Localisation..."
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            className="pl-8 h-9 rounded-lg text-sm"
          />
        </div>

        {(searchQuery || typeFilter !== 'all' || locationQuery) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setLocationQuery('');
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Compteur */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground">
          {filteredJobs.length} offre{filteredJobs.length > 1 ? 's' : ''} trouvée{filteredJobs.length > 1 ? 's' : ''}
        </p>
      )}

      {/* Liste */}
      <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-0.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/50">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-12">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Briefcase className="h-7 w-7 text-red-400" />
            </div>
            <p className="font-medium text-foreground">Erreur de chargement</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              Réessayer
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
              <Briefcase className="h-7 w-7 text-sky-800" />
            </div>
            <p className="font-medium text-foreground">Aucune offre trouvée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onViewDetail={handleViewDetail} onApply={handleApply} />
          ))
        )}
      </div>

      {/* Modales */}
      <JobDetailModal job={detailJob} open={detailOpen} onOpenChange={setDetailOpen} onApply={handleApply} />
      <JobApplicationModal
        job={applyJob}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onSubmit={handleApplicationSubmit}
      />
    </div>
  );
}
