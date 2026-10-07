'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Skill } from '@/types';
import { profilesApi } from '@/lib/api-services';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const MAX_VISIBLE = 2;

export function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setSkills(await profilesApi.listSkills());
    } catch {
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const skill = await profilesApi.addSkill(name.trim());
      setSkills((prev) => [...prev, skill]);
      setName('');
      setIsAdding(false);
    } catch {
      /* silencieux */
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await profilesApi.removeSkill(id);
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* silencieux */
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Compétences</h2>
          {!isAdding ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-sky-800 hover:text-sky-900 hover:bg-sky-50"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Ex: React"
                className="h-8 w-40 text-sm"
              />
              <Button size="sm" className="h-8 bg-sky-900 hover:bg-sky-800 text-white" onClick={handleAdd} disabled={isSaving || !name.trim()}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setIsAdding(false); setName(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : skills.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune compétence renseignée. Cliquez sur « Ajouter » pour commencer.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(showAll ? skills : skills.slice(0, MAX_VISIBLE)).map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-lg border p-3 bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    onClick={() => handleRemove(skill.id)}
                    aria-label={`Supprimer ${skill.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {skills.length > MAX_VISIBLE && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full text-sky-800 hover:text-sky-900 hover:bg-sky-50"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Voir moins'
                  : `Voir plus (${skills.length - MAX_VISIBLE} autre${skills.length - MAX_VISIBLE > 1 ? 's' : ''})`}
                {showAll ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
