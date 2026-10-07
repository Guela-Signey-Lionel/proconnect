'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigationStore, useAuthStore } from '@/store';
import { adminApi } from '@/lib/api-services';

/**
 * Porte d'entrée du back-office, affichée quand un utilisateur authentifié
 * tente d'ouvrir l'espace d'administration sans être ADMIN ni MODERATOR.
 *
 * - Message d'accès refusé + retour à l'accueil.
 * - Si l'entreprise n'a pas encore d'administrateur (aucun compte ADMIN en
 *   base), le premier compte administrateur peut être créé ici via
 *   POST /api/v1/admin/bootstrap/ (route publique côté serveur ; le backend
 *   refuse la création dès qu'un ADMIN existe déjà).
 */
export function AdminAccessGate() {
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const logout = useAuthStore((s) => s.logout);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await adminApi.bootstrap({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setCreatedEmail(email.trim());
    } catch (err) {
      setError(
        (err as Error).message ||
          "Création impossible : un administrateur existe probablement déjà."
      );
    } finally {
      setLoading(false);
    }
  };

  // Compte administrateur créé : l'utilisateur doit se connecter avec celui-ci.
  if (createdEmail) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex items-center justify-center size-16 rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Compte administrateur créé
          </h1>
          <p className="text-sm text-muted-foreground">
            Le compte <span className="font-medium text-foreground">{createdEmail}</span> est
            désormais administrateur de ProConnect. Déconnectez-vous puis connectez-vous avec
            ces identifiants pour accéder au back-office.
          </p>
          <Button onClick={logout} className="w-full">
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background px-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-6 py-10">
        {/* Accès refusé */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center size-14 rounded-xl bg-[#1d3461] text-white">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Espace d&apos;administration</h1>
          <p className="text-sm text-muted-foreground">
            Cet espace est réservé aux comptes administrateurs et modérateurs. Si vous pensez
            avoir droit à cet accès, contactez l&apos;administrateur de votre entreprise.
          </p>
        </div>

        {/* Bootstrap : création du premier administrateur */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Première installation ?</h2>
            <p className="text-xs text-muted-foreground">
              Si votre entreprise n&apos;a pas encore d&apos;administrateur, créez le premier
              compte administrateur ci-dessous.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gate-firstname" className="text-xs">
                  Prénom
                </Label>
                <Input
                  id="gate-firstname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Marie"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gate-lastname" className="text-xs">
                  Nom
                </Label>
                <Input
                  id="gate-lastname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gate-email" className="text-xs">
                Email professionnel
              </Label>
              <Input
                id="gate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@entreprise.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gate-password" className="text-xs">
                Mot de passe (min. 10 caractères)
              </Label>
              <div className="relative">
                <Input
                  id="gate-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
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

            <div className="space-y-1.5">
              <Label htmlFor="gate-confirm" className="text-xs">
                Confirmer le mot de passe
              </Label>
              <Input
                id="gate-confirm"
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Création…
                </>
              ) : (
                'Créer le compte administrateur'
              )}
            </Button>
          </form>
        </div>

        {/* Retour */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigateTo('feed')}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
