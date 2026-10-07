'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { AuthPage } from '@/features/auth/components';
import { MustChangePasswordScreen } from '@/features/auth/components/MustChangePasswordScreen';
import { AdminAccessGate } from '@/features/auth/components/AdminAccessGate';
import { FeedList } from '@/features/feed';
import { ProfilePage } from '@/features/profile';
import { NetworkPage } from '@/features/network';
import { MessagingPage } from '@/features/messaging';
import { JobsPage } from '@/features/jobs';
import { NotificationsPage } from '@/features/notifications';
import { SearchPage } from '@/features/search';
import { SettingsPage } from '@/features/settings';
import { AdminPage } from '@/features/admin';
import { useNavigationStore, useAuthStore, usePreferencesStore } from '@/store';
import { THEME_PRESETS, BACKGROUND_PRESETS, applyThemePreset, applyBackgroundPreset } from '@/lib/theme-presets';
import { usePresenceHeartbeat } from '@/hooks/use-presence';

export default function Home() {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isEntering = useAuthStore((s) => s.isEntering);
  const currentUser = useAuthStore((s) => s.currentUser);
  const finishEntering = useAuthStore((s) => s.finishEntering);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrate = usePreferencesStore((s) => s.hydrate);
  const themeColorPreset = usePreferencesStore((s) => s.themeColorPreset);
  const backgroundPreset = usePreferencesStore((s) => s.backgroundPreset);
  const darkMode = usePreferencesStore((s) => s.darkMode);
  const canOpenAdmin = !!currentUser && (currentUser.isAdmin || currentUser.isModerator);

  // Restaure la session (JWT stocké) + les préférences au premier montage.
  useEffect(() => {
    hydrate();
    bootstrap();
  }, [hydrate, bootstrap]);

  // Apply saved theme on mount (after hydration)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDark = darkMode === 'dark' || (darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const preset = THEME_PRESETS.find((p) => p.id === themeColorPreset);
    if (preset) applyThemePreset(preset, isDark);
    if (!isDark) {
      const bg = BACKGROUND_PRESETS.find((b) => b.id === backgroundPreset);
      if (bg) applyBackgroundPreset(bg);
    }
  }, [themeColorPreset, backgroundPreset, darkMode]);

  // Présence : heartbeat toutes les 60 s tant que la session est ouverte
  // (alimente le point vert « en ligne » visible par les autres utilisateurs).
  usePresenceHeartbeat();

  // Écran d'attente pendant la vérification du token au démarrage.
  if (isBootstrapping) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
        <div className="flex items-center justify-center size-12 rounded-xl bg-[#1d3461] text-white">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Chargement de ProConnect…</p>
      </div>
    );
  }

  // Splash de bienvenue (~3 s) après une connexion réussie, avant la page d'accueil.
  if (isAuthenticated && isEntering) {
    return <WelcomeSplash firstName={currentUser?.firstName} onDone={finishEntering} />;
  }

  // Auth gate – show full-page auth when not logged in
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Changement de mot de passe forcé (compte créé avec un mot de passe temporaire) :
  // écran bloquant tant que l'utilisateur n'a pas défini un nouveau mot de passe.
  if (currentUser?.mustChangePassword) {
    return <MustChangePasswordScreen />;
  }

  // Porte d'entrée du back-office : réservé aux comptes ADMIN / MODERATOR
  // (droits vérifiés côté serveur sur chaque endpoint). Si aucun admin n'existe
  // encore, le premier se crée via POST /api/v1/admin/bootstrap/.
  if (currentPage === 'admin' && !canOpenAdmin) {
    return <AdminAccessGate />;
  }

  const isMessaging = currentPage === 'messaging';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar - mobile & tablet */}
      <TopBar />

      <div className="flex flex-1">
        {/* Left sidebar - desktop (md+) */}
        <LeftSidebar />

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          {isMessaging ? (
            <MessagingPage />
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6 md:pb-6 pb-20">
              {currentPage === 'feed' ? (
                <FeedList />
              ) : currentPage === 'network' ? (
                <NetworkPage />
              ) : currentPage === 'jobs' ? (
                <JobsPage />
              ) : currentPage === 'profile' ? (
                <ProfilePage />
              ) : currentPage === 'notifications' ? (
                <NotificationsPage />
              ) : currentPage === 'search' ? (
                <SearchPage />
              ) : currentPage === 'settings' ? (
                <SettingsPage />
              ) : currentPage === 'admin' ? (
                <AdminPage />
              ) : null}
            </div>
          )}
        </main>

        {/* Right sidebar - desktop (lg+) - hidden on messaging page */}
        {!isMessaging && <RightSidebar />}
      </div>

      {/* Mobile bottom navigation - hidden on messaging page */}
      {!isMessaging && <MobileNav />}
    </div>
  );
}

/**
 * Splash de bienvenue affiché ~3 secondes après le login, puis ouverture de l'app.
 */
function WelcomeSplash({
  firstName,
  onDone,
}: {
  firstName?: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const duration = 3000;
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - started) / duration) * 100));
    }, 50);
    const timer = setTimeout(onDone, duration);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#0d1a30] via-[#142646] to-[#1d3461] text-white">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-48 -left-48 w-[28rem] h-[28rem] rounded-full bg-white/5" />

      <div className="relative z-10 flex items-center justify-center size-20 rounded-2xl bg-white/10 backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="ProConnect" className="size-14" />
      </div>

      <div className="relative z-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">ProConnect</h1>
        <p className="text-sm text-white/70 mt-1">
          {firstName ? `Bienvenue, ${firstName} !` : 'Bienvenue !'}
        </p>
      </div>

      <div className="relative z-10 w-56 h-1 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full bg-white/80 rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="relative z-10 text-xs text-white/50">Ouverture de votre espace…</p>
    </div>
  );
}
