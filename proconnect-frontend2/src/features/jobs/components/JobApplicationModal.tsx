'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Job } from '@/types';

interface JobApplicationModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (jobId: string) => Promise<void>;
}

export function JobApplicationModal({ job, open, onOpenChange, onSubmit }: JobApplicationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!job) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(job.id);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Postuler — {job.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous allez postuler au poste <span className="font-medium text-foreground">{job.title}</span> chez{' '}
            <span className="font-medium text-foreground">{job.company}</span>. Votre profil ProConnect
            sera transmis au recruteur.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            className="w-full rounded-full py-5 text-sm font-semibold bg-sky-900 hover:bg-sky-800 text-white"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer la candidature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
