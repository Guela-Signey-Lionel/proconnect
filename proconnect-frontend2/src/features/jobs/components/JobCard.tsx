'use client';

import { useMemo } from 'react';
import { Bookmark, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Job } from '@/types';

const COMPANY_COLORS = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
];

interface JobCardProps {
  job: Job;
  onViewDetail: (job: Job) => void;
  onApply: (job: Job) => void;
}

export function JobCard({ job, onViewDetail, onApply }: JobCardProps) {
  const colorClass = useMemo(() => {
    const index = job.company.length % COMPANY_COLORS.length;
    return COMPANY_COLORS[index];
  }, [job.company]);

  const initials = job.company
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div
        className="flex items-start gap-3"
        onClick={() => onViewDetail(job)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetail(job);
          }
        }}
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className={cn('text-sm font-semibold', colorClass)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground leading-tight hover:text-sky-800 transition-colors line-clamp-1">
            {job.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {job.type && (
          <Badge variant="secondary" className="text-xs font-medium bg-sky-50 text-sky-800 hover:bg-sky-100">
            {job.type}
          </Badge>
        )}
        {job.category && (
          <Badge variant="secondary" className="text-xs font-medium bg-muted text-muted-foreground hover:bg-muted">
            {job.category}
          </Badge>
        )}
      </div>

      {job.salary && (
        <p className="text-sm font-medium text-foreground mt-2">{job.salary}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{job.postedAt}</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {job.applicants} candidat{job.applicants > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
            aria-label="Sauvegarder"
          >
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            className={cn(
              'h-8 text-xs rounded-full px-3',
              job.isApplied
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                : 'bg-sky-900 hover:bg-sky-800 text-white'
            )}
            disabled={job.isApplied}
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
          >
            {job.isApplied ? 'Candidature envoyée' : 'Postuler'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
