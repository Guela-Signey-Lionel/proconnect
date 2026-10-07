'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProfileDetail } from '@/types';
import { profilesApi } from '@/lib/api-services';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

export function AboutSection() {
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setProfile(await profilesApi.me());
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = () => {
    setEditBio(profile?.bio ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditBio(profile?.bio ?? '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await profilesApi.update(profile.id, { bio: editBio.trim() || undefined });
      setProfile(updated);
      setIsEditing(false);
    } catch {
      /* silencieux */
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">À propos</h2>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!profile ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">Biographie</Label>
              <Textarea
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Parlez de vous..."
                className="min-h-[120px] resize-y"
              />
              <p className="text-xs text-muted-foreground text-right">{editBio.length}/2600</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1">
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1 bg-sky-900 hover:bg-sky-800 text-white"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {profile.bio || 'Aucune biographie renseignée.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
