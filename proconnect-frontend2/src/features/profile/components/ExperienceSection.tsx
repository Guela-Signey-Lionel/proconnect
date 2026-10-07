'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Experience } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { profilesApi } from '@/lib/api-services';
import { Briefcase, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatDate(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'MMM. yyyy', { locale: fr });
  } catch {
    try {
      const date = parse(dateStr, 'yyyy-MM', new Date());
      return format(date, 'MMM. yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  }
}

function ExperienceItem({ experience, onDelete }: { experience: Experience; onDelete: (id: string) => void }) {
  const startDate = formatDate(experience.startDate);
  const endDate = experience.endDate ? formatDate(experience.endDate) : 'Présent';
  const period = `${startDate} - ${endDate}`;

  return (
    <div className="flex gap-3">
      <Avatar className="h-12 w-12 shrink-0 mt-0.5">
        <AvatarFallback className="bg-sky-50 text-sky-700 text-xs font-medium">
          {experience.company.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {experience.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {experience.company}
            </p>
          </div>
          {!experience.endDate && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-medium">
              Actuel
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {period}
          </span>
        </div>

        {experience.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {experience.description}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
        onClick={() => onDelete(experience.id)}
        aria-label="Supprimer l'expérience"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const MAX_VISIBLE = 2;

export function ExperienceSection() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setExperiences(await profilesApi.listExperiences());
    } catch {
      setExperiences([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!title.trim() || !company.trim() || !startDate) return;
    setIsSaving(true);
    try {
      await profilesApi.addExperience({
        title: title.trim(),
        company: company.trim(),
        startDate,
        endDate: endDate || null,
        description: description.trim() || null,
      });
      setShowAdd(false);
      setTitle(''); setCompany(''); setStartDate(''); setEndDate(''); setDescription('');
      await load();
    } catch {
      /* silencieux */
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await profilesApi.removeExperience(id);
      setExperiences((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* silencieux */
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Expérience</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune expérience renseignée. Cliquez sur « Ajouter » pour commencer.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              {(showAll ? experiences : experiences.slice(0, MAX_VISIBLE)).map((exp, index, arr) => (
                <div key={exp.id}>
                  <ExperienceItem experience={exp} onDelete={handleDelete} />
                  {index < arr.length - 1 && <Separator className="mt-5" />}
                </div>
              ))}
            </div>
            {experiences.length > MAX_VISIBLE && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full text-sky-800 hover:text-sky-900 hover:bg-sky-50"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Voir moins'
                  : `Voir plus (${experiences.length - MAX_VISIBLE} autre${experiences.length - MAX_VISIBLE > 1 ? 's' : ''})`}
                {showAll ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </>
        )}
      </CardContent>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une expérience</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Poste *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Développeur Full-Stack" />
            </div>
            <div className="space-y-1.5">
              <Label>Entreprise *</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: TechCorp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de début *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Décrivez vos missions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !company.trim() || !startDate || isSaving}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
