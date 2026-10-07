'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileDetail } from '@/types';
import { profilesApi, authApi } from '@/lib/api-services';
import { useAuthStore } from '@/store';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Building2, Briefcase, Pencil, Loader2, Camera, Image as ImageIcon, Phone } from 'lucide-react';
import { OnlineIndicator } from '@/components/ui/online-indicator';
import { useIsOnline } from '@/hooks/use-presence';

export function ProfileHeader() {
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Statut en ligne (hook AVANT tout early return — règles des hooks).
  const presenceOnline = useIsOnline(profile?.userId);

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

  if (!profile) {
    return <div className="h-[280px] rounded-xl border bg-card animate-pulse" />;
  }

  const fullName = profile.fullName;
  const initials = getInitials(...fullName.split(/\s+/).slice(0, 2) as [string, string]);
  // Priorité au champ `online` du profil (déjà chargé), sinon le hook de présence.
  const isOnline = profile.online ?? presenceOnline;

  const openEdit = () => {
    setJobTitle(profile.jobTitle ?? '');
    setDepartment(profile.department ?? '');
    setLocation(profile.location ?? '');
    setBio(profile.bio ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setSaveError('');
    setShowEdit(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      // Email/téléphone : PATCH /auth/me/ (compte)
      await authApi.updateAccount({
        email: email.trim() || undefined,
        phone: phone.trim(),
      });
      // Le reste : PATCH /profiles/{id}/
      const updated = await profilesApi.update(profile.id, {
        jobTitle: jobTitle.trim() || undefined,
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setProfile(updated);
      await useAuthStore.getState().refreshCurrentUser();
      setShowEdit(false);
    } catch (e) {
      setSaveError((e as Error).message || 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatar = async (file: File) => {
    setIsUploading(true);
    try {
      const updated = await profilesApi.uploadMyAvatar(file);
      setProfile(updated);
      // Propage la nouvelle photo vers le sidebar gauche et le menu en haut à droite.
      await useAuthStore.getState().refreshCurrentUser();
    } catch {
      /* silencieux */
    } finally {
      setIsUploading(false);
    }
  };

  const handleCover = async (file: File) => {
    setIsUploadingCover(true);
    try {
      const updated = await profilesApi.uploadMyCover(file);
      setProfile(updated);
    } catch {
      /* silencieux */
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Photo de couverture (ou dégradé bleu nuit par défaut) */}
      <div className="h-[200px] relative group">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-950 via-sky-900 to-sky-800" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.25),_transparent_60%)]" />
          </>
        )}
        {/* Bouton changer la couverture */}
        <button
          type="button"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center shadow-md hover:bg-black/60 transition-colors"
          onClick={() => coverRef.current?.click()}
          aria-label="Changer la photo de couverture"
          disabled={isUploadingCover}
        >
          {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCover(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="relative px-4 sm:px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-[40px] mb-3 relative w-fit">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white shadow-lg">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={fullName} />}
            <AvatarFallback className="text-xl md:text-2xl font-semibold bg-sky-100 text-sky-800">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Pastille verte : utilisateur en ligne (visible par tous sur le profil) */}
          {/* Placée en haut à droite : le bouton caméra occupe le bas droit. */}
          <OnlineIndicator
            online={isOnline}
            size="lg"
            ring="ring-white"
            className="bottom-auto top-0 -translate-y-[15%]"
          />
          <button
            type="button"
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-sky-900 text-white flex items-center justify-center shadow-md hover:bg-sky-800 transition-colors"
            onClick={() => fileRef.current?.click()}
            aria-label="Changer la photo de profil"
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatar(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{fullName}</h1>
              {isOnline && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En ligne
                </span>
              )}
            </div>
            {profile.jobTitle && (
              <p className="text-sm sm:text-base text-muted-foreground mt-0.5">{profile.jobTitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-sm text-muted-foreground">
              {profile.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{profile.department}</span>
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{profile.location}</span>
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{profile.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span>{profile.email}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modifier le profil</span>
              <span className="sm:hidden">Modifier</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dialoge d'édition */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Adresse e-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre.nom@entreprise.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro de téléphone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: +237 6XX XX XX XX" />
            </div>
            <div className="space-y-1.5">
              <Label>Poste</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex: Développeur Full-Stack" />
            </div>
            <div className="space-y-1.5">
              <Label>Département / Entreprise</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ex: TechCorp" />
            </div>
            <div className="space-y-1.5">
              <Label>Localisation</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Paris, France" />
            </div>
            <div className="space-y-1.5">
              <Label>Biographie</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Parlez de vous…" />
            </div>
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-sky-900 hover:bg-sky-800 text-white">
              {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
