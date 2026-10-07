'use client';

import { useMemo } from 'react';
import { MapPin, Clock, Users, CheckCircle2, Euro } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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

interface JobDetailModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (job: Job) => void;
}

export function JobDetailModal({ job, open, onOpenChange, onApply }: JobDetailModalProps) {
  const colorClass = useMemo(() => {
    if (!job) return COMPANY_COLORS[0];
    const index = job.company.length % COMPANY_COLORS.length;
    return COMPANY_COLORS[index];
  }, [job]);

  if (!job) return null;

  const initials = job.company
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 mt-1">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className={cn('text-base font-semibold', colorClass)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-xl leading-tight">{job.title}</DialogTitle>
              <p className="text-base text-muted-foreground mt-1">{job.company}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
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

        {/* Infos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-sky-800 shrink-0" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-sky-800 shrink-0" />
            <span>Publié {job.postedAt.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-sky-800 shrink-0" />
            <span>{job.applicants} candidat{job.applicants > 1 ? 's' : ''}</span>
          </div>
          {job.salary && (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Euro className="h-4 w-4 text-sky-800 shrink-0" />
              <span>{job.salary}</span>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        {/* Description */}
        <div>
          <h4 className="font-semibold text-sm text-foreground mb-2">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {job.description || 'Aucune description fournie.'}
          </p>
        </div>

        {/* Compétences */}
        {job.skills.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Compétences</h4>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Exigences */}
        {job.requirements.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Exigences</h4>
              <ul className="space-y-2">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-sky-800 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <Separator className="my-3" />

        {/* Postuler */}
        <Button
          className={cn(
            'w-full rounded-full py-5 text-sm font-semibold',
            job.isApplied
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default'
              : 'bg-sky-900 hover:bg-sky-800 text-white'
          )}
          disabled={job.isApplied}
          onClick={() => onApply(job)}
        >
          {job.isApplied ? '✓ Candidature envoyée' : 'Postuler maintenant'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
