'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Education } from '@/types';
import { profilesApi } from '@/lib/api-services';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { GraduationCap, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatDate(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'MMM. yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function EducationItem({ education, onDelete }: { education: Education; onDelete: (id: string) => void }) {
  const startDate = formatDate(education.startDate);
  const endDate = education.endDate ? formatDate(education.endDate) : '';
  const period = endDate ? `${startDate} - ${endDate}` : startDate;

  return (
    <div className="flex gap-3">
      <Avatar className="h-12 w-12 shrink-0 mt-0.5">
        <AvatarFallback className="bg-sky-50 text-sky-800 text-xs font-medium">
          {education.school.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{education.school}</h3>
        <p className="text-sm text-muted-foreground">{education.degree}</p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <GraduationCap className="h-3 w-3" />
          <span>{period}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
        onClick={() => onDelete(education.id)}
        aria-label="Supprimer la formation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const MAX_VISIBLE = 2;

export function EducationSection() {
  const [education, setEducation] = useState<Education[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setEducation(await profilesApi.listEducation());
    } catch {
      setEducation([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!school.trim() || !degree.trim() || !startDate) return;
    setIsSaving(true);
    try {
      await profilesApi.addEducation({
        school: school.trim(),
        degree: degree.trim(),
        startDate,
        endDate: endDate || null,
      });
      setShowAdd(false);
      setSchool(''); setDegree(''); setStartDate(''); setEndDate('');
      await load();
    } catch {
      /* silencieux */
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await profilesApi.removeEducation(id);
      setEducation((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* silencieux */
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Formation</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sky-800 hover:text-sky-900 hover:bg-sky-50"
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
        ) : education.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune formation renseignée. Cliquez sur « Ajouter » pour commencer.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              {(showAll ? education : education.slice(0, MAX_VISIBLE)).map((edu, index, arr) => (
                <div key={edu.id}>
                  <EducationItem education={edu} onDelete={handleDelete} />
                  {index < arr.length - 1 && <Separator className="mt-5" />}
                </div>
              ))}
            </div>
            {education.length > MAX_VISIBLE && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full text-sky-800 hover:text-sky-900 hover:bg-sky-50"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Voir moins'
                  : `Voir plus (${education.length - MAX_VISIBLE} autre${education.length - MAX_VISIBLE > 1 ? 's' : ''})`}
                {showAll ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une formation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>École / Université *</Label>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Ex: Université de Paris" />
            </div>
            <div className="space-y-1.5">
              <Label>Diplôme *</Label>
              <Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="Ex: Master Informatique" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button
              onClick={handleAdd}
              disabled={!school.trim() || !degree.trim() || !startDate || isSaving}
              className="bg-sky-900 hover:bg-sky-800 text-white"
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
