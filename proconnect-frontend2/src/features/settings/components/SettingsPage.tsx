'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthStore, usePreferencesStore } from '@/store';
import { authApi } from '@/lib/api-services';
import { connectionsApi } from '@/lib/api-services';
import { playSound, SOUND_PRESETS, type SoundId } from '@/lib/sounds';
import {
  THEME_PRESETS, BACKGROUND_PRESETS, applyThemePreset, applyBackgroundPreset, resetTheme,
} from '@/lib/theme-presets';
import {
  Shield, Bell, Lock, Palette, UserCircle, Database, Eye, EyeOff, Monitor,
  Globe, Download, Trash2, AlertTriangle, LogOut, Check, Volume2, VolumeX,
  Play, Sun, Moon, MonitorIcon, Paintbrush, Loader2, Ban,
} from 'lucide-react';

type SettingsSection = 'privacy' | 'notifications' | 'sounds' | 'security' | 'appearance' | 'account' | 'data';

const settingsNav: { key: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { key: 'privacy', label: 'Confidentialité', icon: <Shield className="h-4 w-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { key: 'sounds', label: 'Sons', icon: <Volume2 className="h-4 w-4" /> },
  { key: 'security', label: 'Sécurité', icon: <Lock className="h-4 w-4" /> },
  { key: 'appearance', label: 'Apparence', icon: <Palette className="h-4 w-4" /> },
  { key: 'account', label: 'Compte', icon: <UserCircle className="h-4 w-4" /> },
  { key: 'data', label: 'Données', icon: <Database className="h-4 w-4" /> },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('privacy');

  return (
    <div className="flex flex-col sm:flex-row gap-4 -m-4 sm:m-0">
      {/* Navigation */}
      <Card className="sm:w-56 shrink-0 border-0 sm:border">
        <CardContent className="p-2 sm:p-2">
          <nav className="flex sm:flex-col gap-0.5 overflow-x-auto sm:overflow-visible px-1">
            {settingsNav.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full text-left',
                  activeSection === item.key
                    ? 'bg-sky-100 text-sky-900'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="flex-1 min-w-0">
        {activeSection === 'privacy' && <PrivacySection />}
        {activeSection === 'notifications' && <NotificationSettingsSection />}
        {activeSection === 'sounds' && <SoundSettingsSection />}
        {activeSection === 'security' && <SecuritySection />}
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'account' && <AccountSection />}
        {activeSection === 'data' && <DataSection />}
      </div>
    </div>
  );
}

/* ─── Confidentialité ─── */
function PrivacySection() {
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    connectionsApi
      .listBlocks()
      .then((blocks: unknown[]) => {
        setBlockedUsers(
          blocks.map((b: any, i: number) => ({
            id: b.id ?? String(i),
            name: b.blocked?.fullName ?? b.blockedName ?? b.name ?? 'Utilisateur',
          }))
        );
      })
      .catch(() => setBlockedUsers([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Confidentialité</h2>
        <p className="text-sm text-muted-foreground">Gérez la visibilité de votre profil et de vos activités.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Utilisateurs bloqués</h3>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun utilisateur bloqué</p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Utilisateur bloqué</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Notifications ─── */
function NotificationSettingsSection() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">Configurez comment vous recevez les notifications.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold">Canaux de notification</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notifications par e-mail</p>
              <p className="text-xs text-muted-foreground">Recevez des mises à jour par e-mail</p>
            </div>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notifications push</p>
              <p className="text-xs text-muted-foreground">Recevez des alertes sur votre appareil</p>
            </div>
            <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notifications in-app</p>
              <p className="text-xs text-muted-foreground">Notifications dans l'application</p>
            </div>
            <Switch checked={inAppNotif} onCheckedChange={setInAppNotif} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sons ─── */
function SoundSettingsSection() {
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const soundPreset = usePreferencesStore((s) => s.soundPreset);
  const soundVolume = usePreferencesStore((s) => s.soundVolume);
  const setSoundEnabled = usePreferencesStore((s) => s.setSoundEnabled);
  const setSoundPreset = usePreferencesStore((s) => s.setSoundPreset);
  const setSoundVolume = usePreferencesStore((s) => s.setSoundVolume);
  const setSoundForType = usePreferencesStore((s) => s.setSoundForType);

  const soundForMessageSent = usePreferencesStore((s) => s.soundForMessageSent);
  const soundForMessageReceived = usePreferencesStore((s) => s.soundForMessageReceived);
  const soundForNotification = usePreferencesStore((s) => s.soundForNotification);
  const soundForLike = usePreferencesStore((s) => s.soundForLike);

  const handlePreview = useCallback((soundId: SoundId) => {
    playSound(soundId, soundPreset, soundVolume);
  }, [soundPreset, soundVolume]);

  const soundToggles: { key: string; label: string; value: boolean }[] = [
    { key: 'messageSent', label: 'Message envoyé', value: soundForMessageSent },
    { key: 'messageReceived', label: 'Message reçu', value: soundForMessageReceived },
    { key: 'notification', label: 'Notifications', value: soundForNotification },
    { key: 'like', label: "J'aime", value: soundForLike },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sons</h2>
        <p className="text-sm text-muted-foreground">Personnalisez les sons de notification de l'application.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                soundEnabled ? 'bg-sky-100 text-sky-900' : 'bg-gray-100 text-gray-400'
              )}>
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Sons activés</p>
                <p className="text-xs text-muted-foreground">Activer ou désactiver tous les sons</p>
              </div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>

          {soundEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Volume</p>
                  <span className="text-xs text-muted-foreground font-mono">{Math.round(soundVolume * 100)}%</span>
                </div>
                <Slider
                  value={[soundVolume * 100]}
                  onValueChange={(v) => setSoundVolume(v[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {soundEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Pack de sons</h3>
            <p className="text-xs text-muted-foreground">Choisissez le style de sons de notification</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSoundPreset(preset.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                    soundPreset === preset.id
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40'
                      : 'border-border hover:border-sky-300 hover:bg-muted/50'
                  )}
                >
                  <span className="text-2xl">{preset.icon}</span>
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-semibold truncate',
                      soundPreset === preset.id ? 'text-sky-900 dark:text-sky-300' : 'text-foreground'
                    )}>
                      {preset.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{preset.description}</p>
                  </div>
                  {soundPreset === preset.id && (
                    <Check className="h-4 w-4 text-sky-800 shrink-0 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {soundEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Sons individuels</h3>
            <p className="text-xs text-muted-foreground">Activez ou désactivez chaque son et écoutez un aperçu</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {soundToggles.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-muted/30">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(item.key as SoundId)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label={`Écouter ${item.label}`}
                    title="Écouter"
                  >
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <Switch checked={item.value} onCheckedChange={(v) => setSoundForType(item.key, v)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Sécurité ─── */
function SecuritySection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sécurité</h2>
        <p className="text-sm text-muted-foreground">Protégez votre compte avec un mot de passe fort.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold">Changer le mot de passe</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? 'Masquer' : 'Afficher'}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNew ? 'Masquer' : 'Afficher'}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? 'Masquer' : 'Afficher'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || isSaving}
            className="bg-sky-900 hover:bg-sky-800 text-white"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {saved ? <Check className="h-4 w-4 mr-1.5" /> : null}
            {saved ? 'Mis à jour !' : 'Mettre à jour'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Apparence ─── */
function AppearanceSection() {
  const themeColorPreset = usePreferencesStore((s) => s.themeColorPreset);
  const backgroundPreset = usePreferencesStore((s) => s.backgroundPreset);
  const darkMode = usePreferencesStore((s) => s.darkMode);
  const setThemeColorPreset = usePreferencesStore((s) => s.setThemeColorPreset);
  const setBackgroundPreset = usePreferencesStore((s) => s.setBackgroundPreset);
  const setDarkMode = usePreferencesStore((s) => s.setDarkMode);

  const handleThemeColorChange = (presetId: string) => {
    setThemeColorPreset(presetId);
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) applyThemePreset(preset, darkMode === 'dark');
  };

  const handleBackgroundChange = (bgId: string) => {
    setBackgroundPreset(bgId);
    const bg = BACKGROUND_PRESETS.find((b) => b.id === bgId);
    if (bg && darkMode !== 'dark') applyBackgroundPreset(bg);
  };

  const handleDarkMode = (mode: 'light' | 'dark' | 'system') => {
    setDarkMode(mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
      const bg = BACKGROUND_PRESETS.find((b) => b.id === backgroundPreset);
      if (bg) applyBackgroundPreset(bg);
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        const bg = BACKGROUND_PRESETS.find((b) => b.id === backgroundPreset);
        if (bg) applyBackgroundPreset(bg);
      }
    }
    const preset = THEME_PRESETS.find((p) => p.id === themeColorPreset);
    if (preset) applyThemePreset(preset, mode === 'dark');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Apparence</h2>
        <p className="text-sm text-muted-foreground">Personnalisez l'affichage et les couleurs de l'application.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold">Mode d'affichage</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {([
              { mode: 'light' as const, label: 'Clair', icon: <Sun className="h-5 w-5" /> },
              { mode: 'dark' as const, label: 'Sombre', icon: <Moon className="h-5 w-5" /> },
              { mode: 'system' as const, label: 'Système', icon: <MonitorIcon className="h-5 w-5" /> },
            ]).map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => handleDarkMode(mode)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  darkMode === mode
                    ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40'
                    : 'border-border hover:border-sky-300 hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  darkMode === mode ? 'bg-sky-900 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {icon}
                </div>
                <span className={cn(
                  'text-xs font-semibold',
                  darkMode === mode ? 'text-sky-900 dark:text-sky-300' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {darkMode !== 'dark' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Couleur du thème</h3>
            </div>
            <p className="text-xs text-muted-foreground">Changez la couleur principale de l'application</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleThemeColorChange(preset.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    themeColorPreset === preset.id
                      ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/40'
                      : 'border-border hover:border-sky-300'
                  )}
                >
                  <div
                    className="h-12 w-12 rounded-full shadow-sm"
                    style={{ background: preset.preview }}
                  />
                  <p className={cn(
                    'text-xs font-semibold text-center',
                    themeColorPreset === preset.id ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {preset.label}
                  </p>
                  {themeColorPreset === preset.id && (
                    <Check className="h-3.5 w-3.5 text-sky-800" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {darkMode !== 'dark' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Couleur de fond</h3>
            </div>
            <p className="text-xs text-muted-foreground">Personnalisez la couleur de fond des pages</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {BACKGROUND_PRESETS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => handleBackgroundChange(bg.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all',
                    backgroundPreset === bg.id
                      ? 'border-sky-600'
                      : 'border-border hover:border-sky-300'
                  )}
                >
                  <div
                    className="h-10 w-10 rounded-lg shadow-sm border"
                    style={{ background: bg.preview, borderColor: '#e2e8f0' }}
                  />
                  <span className={cn(
                    'text-[11px] font-semibold text-center',
                    backgroundPreset === bg.id ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {bg.label}
                  </span>
                  {backgroundPreset === bg.id && (
                    <Check className="h-3 w-3 text-sky-800 absolute top-1.5 right-1.5" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          resetTheme();
          setThemeColorPreset('sky');
          setBackgroundPreset('white');
          handleDarkMode('light');
        }}
      >
        Réinitialiser les couleurs par défaut
      </Button>
    </div>
  );
}

/* ─── Compte ─── */
function AccountSection() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await authApi.deactivate();
      logout();
    } catch {
      /* silencieux */
    } finally {
      setIsDeactivating(false);
      setShowDeactivate(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Compte</h2>
        <p className="text-sm text-muted-foreground">Gérez les informations de votre compte.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Adresse e-mail</p>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Nom complet</p>
              <p className="text-sm text-muted-foreground">
                {currentUser?.fullName ?? `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Rôle</p>
              <p className="text-sm text-muted-foreground">{currentUser?.role ?? 'EMPLOYEE'}</p>
            </div>
          </div>
          <Separator />
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Zone de danger
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Désactiver le compte</p>
              <p className="text-xs text-muted-foreground">
                Votre profil sera masqué mais vos données seront conservées.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              onClick={() => setShowDeactivate(true)}
            >
              Désactiver
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Désactiver votre compte ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Votre profil sera masqué mais vos données seront conservées. Vous pourrez réactiver
            votre compte en vous reconnectant.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivate(false)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Données ─── */
function DataSection() {
  const handleExport = () => {
    // Export local des préférences (le backend n'expose pas encore d'export GDPR)
    const prefs = localStorage.getItem('pc_sound_enabled') ?? '';
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), soundEnabled: prefs }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proconnect-donnees.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Données</h2>
        <p className="text-sm text-muted-foreground">Téléchargez et consultez vos données.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Exporter mes données</p>
              <p className="text-xs text-muted-foreground">
                Téléchargez une copie de vos préférences locales.
              </p>
            </div>
            <Button className="bg-sky-900 hover:bg-sky-800 text-white shrink-0" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
