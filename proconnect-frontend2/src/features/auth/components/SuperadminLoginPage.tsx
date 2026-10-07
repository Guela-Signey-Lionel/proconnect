'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuthStore } from '@/store';

/**
 * Porte d'entrée de l'espace d'administration : une connexion dédiée avec les
 * identifiants du compte Superadmin (superadmin@proconnect.com) est exigée,
 * même si une session ADMIN est déjà ouverte. Tant que ces identifiants ne
 * sont pas saisis, l'interface d'administration reste inaccessible.
 */
export function SuperadminLoginPage() {
  const unlock = useAdminAuthStore((s) => s.unlock);
  const completePasswordChange = useAdminAuthStore((s) => s.completePasswordChange);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Phase 2 : premier login → mot de passe temporaire à remplacer.
  const [pendingPasswordChange, setPendingPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Veuillez saisir vos identifiants.');
      return;
    }
    setLoading(true);
    try {
      const result = await unlock(email, password);
      if (result === 'mustChangePassword') {
        setPendingPasswordChange(true);
      } else if (result === 'error') {
        setError('Identifiants invalides ou compte non autorisé (accès Superadmin requis).');
      }
      // result === 'ok' : le gate se ferme tout seul (session admin posée).
    } finally {
      setLoading(false);
    }
  };

  const submitPasswordChange = async () => {
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
      await completePasswordChange(newPassword);
    } catch (e) {
      setError((e as Error).message || 'Changement impossible.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Phase changement de mot de passe obligatoire -------------- */
  if (pendingPasswordChange) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-[#0d1a30] via-[#142646] to-[#1d3461] px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex items-center justify-center size-14 rounded-xl bg-white/10 text-white">
              <KeyRound className="size-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Définissez votre mot de passe
            </h1>
            <p className="text-sm text-white/70">
              Votre compte Superadmin a été créé avec un mot de passe temporaire. Vous devez en
              définir un nouveau avant d&apos;accéder à l&apos;espace d&apos;administration.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-white/95 backdrop-blur p-6 space-y-4 shadow-xl">
            <div className="space-y-2">
              <Label htmlFor="sa-new" className="text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </Label>
              <Input
                id="sa-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 10 caractères"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-confirm" className="text-sm font-medium text-gray-700">
                Confirmer le nouveau mot de passe
              </Label>
              <Input
                id="sa-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPasswordChange()}
                className="h-11"
              />
            </div>
            <Button
              onClick={submitPasswordChange}
              disabled={loading || !newPassword || !confirm}
              className="w-full h-11 bg-[#1d3461] hover:bg-[#142646] text-white font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {loading ? 'Enregistrement…' : 'Définir le nouveau mot de passe'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Phase connexion ----------------------------- */
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-[#0d1a30] via-[#142646] to-[#1d3461] px-6">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-[28rem] h-[28rem] rounded-full bg-white/5 pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center size-14 rounded-xl bg-white/10 text-white">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Espace d&apos;administration
          </h1>
          <p className="text-sm text-white/70">
            Accès réservé au Superadmin. Veuillez vous authentifier avec les identifiants
            préconfigurés du compte Superadmin.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white/95 backdrop-blur p-6 space-y-4 shadow-xl">
          <div className="space-y-2">
            <Label htmlFor="sa-email" className="text-sm font-medium text-gray-700">
              Adresse e-mail
            </Label>
            <Input
              id="sa-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@proconnect.com"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-password" className="text-sm font-medium text-gray-700">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                id="sa-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
          </div>
          <Button
            onClick={submit}
            disabled={loading || !email.trim() || !password}
            className="w-full h-11 bg-[#1d3461] hover:bg-[#142646] text-white font-semibold gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {loading ? 'Vérification…' : 'Accéder à l’espace Superadmin'}
          </Button>
          <p className="text-[11px] text-gray-500 text-center">
            Session sécurisée : toute action d&apos;administration est journalisée au nom du
            compte Superadmin.
          </p>
        </div>
      </div>
    </div>
  );
}
