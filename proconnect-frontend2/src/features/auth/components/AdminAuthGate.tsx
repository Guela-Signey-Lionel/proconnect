'use client';

/**
 * Porte d'authentification du back-office : l'utilisateur ADMIN (ou MODERATOR)
 * doit ressaisir ses identifiants pour ouvrir l'espace d'administration.
 * La vérification se fait côté serveur via POST /api/v1/admin/verify-credentials/
 * (compare le mot de passe saisi à celui de la session courante).
 * Une fois validée, l'accès reste ouvert pour la session de l'onglet
 * (sessionStorage `pc_admin_unlocked_<id>`).
 */

import { useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigationStore, useAuthStore } from '@/store';
import { authApi } from '@/lib/api-services';

const UNLOCK_KEY = 'pc_admin_unlocked';

/** L'accès est-il déverrouillé pour cet utilisateur dans cet onglet ? */
export function isAdminUnlocked(userId: string | undefined): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === userId;
  } catch {
    return false;
  }
}

export function lockAdminAccess(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* silencieux */
  }
}

function unlockAdmin(userId: string): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, userId);
  } catch {
    /* silencieux */
  }
}

export function AdminAuthGate({ onUnlocked }: { onUnlocked: () => void }) {
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  // L'email est pré-rempli avec celui de la session courante.
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.adminVerifyCredentials(password);
      if (res.valid && currentUser) {
        unlockAdmin(currentUser.id);
        onUnlocked();
        return;
      }
      setError('Identifiants incorrects. Réessayez.');
    } catch (err) {
      setError((err as Error).message || 'Erreur interne du serveur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6 overflow-y-auto">
      <div className="w-full max-w-sm space-y-6 py-10">
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center size-14 rounded-xl bg-[#1d3461] text-white">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Accès à l&apos;administration</h1>
          <p className="text-sm text-muted-foreground">
            Pour votre sécurité, confirmez vos identifiants pour ouvrir le
            back-office et gérer les utilisateurs.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-gate-email" className="text-xs">
                Email
              </Label>
              <Input
                id="admin-gate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-gate-password" className="text-xs">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="admin-gate-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Vérification…
                </>
              ) : (
                'Ouvrir le back-office'
              )}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <Button
            variant="ghost"
            onClick={() => navigateTo('feed')}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Annuler
          </Button>
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
          >
            Ce n&apos;est pas mon compte ? Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
