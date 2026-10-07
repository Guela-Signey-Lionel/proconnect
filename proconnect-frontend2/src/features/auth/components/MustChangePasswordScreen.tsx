'use client';

import { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api-services';

/**
 * Écran bloquant affiché quand le serveur a posé mustChangePassword=true
 * (compte Superadmin créé par bootstrap, par exemple). L'utilisateur doit
 * définir un nouveau mot de passe avant d'accéder à l'application.
 */
export function MustChangePasswordScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const refreshCurrentUser = useAuthStore((s) => s.refreshCurrentUser);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (newPassword.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      // mustChangePassword=true : le serveur n'exige pas l'ancien mot de passe
      // (l'utilisateur est déjà authentifié par un JWT valide).
      await authApi.changePassword('', newPassword);
      setDone(true);
      await refreshCurrentUser();
    } catch (e) {
      setError((e as Error).message || 'Changement impossible.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center size-16 rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold">Mot de passe mis à jour</h2>
          <p className="text-sm text-muted-foreground">Ouverture de votre espace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center size-14 rounded-xl bg-[#1d3461] text-white">
            <KeyRound className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Changez votre mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.firstName
              ? `Bonjour ${currentUser.firstName}, `
              : ''}
            votre compte a été créé avec un mot de passe temporaire. Vous devez en définir un
            nouveau avant de continuer.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-new" className="text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="mcp-new"
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 10 caractères"
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-confirm" className="text-sm font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </Label>
            <Input
              id="mcp-confirm"
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="h-11"
            />
          </div>
          <Button
            onClick={submit}
            disabled={loading || !newPassword || !confirm}
            className="w-full h-11 bg-[#2f5496] hover:bg-[#26447d] text-white font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Enregistrement…' : 'Définir le nouveau mot de passe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
