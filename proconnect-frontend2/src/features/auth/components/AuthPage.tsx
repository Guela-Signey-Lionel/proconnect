'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Building2, MessageSquare, FolderOpen, Users, Shield, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api-services';
import { API_BASE_URL } from '@/lib/api';

type AuthView = 'login' | 'register' | 'forgot';
type RegisterStep = 1 | 2 | 3;

/* ------------------------------------------------------------------ */
/*  Panneau gauche – branding bleu nuit (50% sur desktop)              */
/* ------------------------------------------------------------------ */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0d1a30] via-[#142646] to-[#1d3461] text-white flex-col justify-between p-10 xl:p-16 overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-48 -left-48 w-[28rem] h-[28rem] rounded-full bg-white/5" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/[0.03]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <svg className="absolute bottom-10 right-10 w-40 h-40 opacity-[0.07]" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="60" r="20" stroke="white" strokeWidth="1.5" />
        <circle cx="50" cy="140" r="16" stroke="white" strokeWidth="1.5" />
        <circle cx="150" cy="140" r="16" stroke="white" strokeWidth="1.5" />
        <circle cx="100" cy="170" r="12" stroke="white" strokeWidth="1.5" />
        <line x1="100" y1="80" x2="50" y2="124" stroke="white" strokeWidth="1" />
        <line x1="100" y1="80" x2="150" y2="124" stroke="white" strokeWidth="1" />
        <line x1="50" y1="156" x2="100" y2="158" stroke="white" strokeWidth="1" />
        <line x1="100" y1="158" x2="150" y2="156" stroke="white" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ProConnect</span>
          </div>
          <p className="text-sky-200/70 text-sm ml-14">Réseau professionnel d&apos;entreprise</p>
        </div>

        <div className="space-y-10 max-w-md">
          <h2 className="text-3xl xl:text-[2.5rem] font-bold leading-tight">
            La plateforme qui{' '}
            <span className="text-[#8aa6df]">connecte</span> votre{' '}
            <span className="text-[#8aa6df]">entreprise</span>
          </h2>

          <div className="space-y-5">
            <FeatureItem
              icon={<MessageSquare className="w-5 h-5" />}
              title="Communication interne"
              desc="Messagerie instantanée, notifications temps réel et partage de fichiers pour votre équipe."
            />
            <FeatureItem
              icon={<FolderOpen className="w-5 h-5" />}
              title="Partage de documents"
              desc="Échangez des fichiers, publications et informations au sein de votre institution."
            />
            <FeatureItem
              icon={<Users className="w-5 h-5" />}
              title="Réseau professionnel"
              desc="Connectez les collaborateurs, créez des groupes de travail et renforcez la collaboration."
            />
            <FeatureItem
              icon={<Shield className="w-5 h-5" />}
              title="Environnement sécurisé"
              desc="Authentification JWT, rôles administrateur et espaces de travail protégés."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-6 text-sm text-sky-200/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Accès sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Données d&apos;entreprise protégées</span>
            </div>
          </div>
          <p className="text-sky-200/60 text-xs">
            © 2026 ProConnect — Le réseau professionnel de votre entreprise.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-[15px]">{title}</p>
        <p className="text-sky-100/80 text-sm leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[#1d3461] flex items-center justify-center">
        <Building2 className="w-5 h-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-[#1d3461] leading-tight">ProConnect</span>
        <span className="text-[10px] text-gray-400 leading-tight">Réseau professionnel d&apos;entreprise</span>
      </div>
    </div>
  );
}

/* Google 'G' officiel */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const stepLabels = ['Compte', 'Profil', 'Confirmation'];

function ProgressStepper({ step }: { step: RegisterStep }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-xs mx-auto mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div className="relative flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                s < step
                  ? 'bg-[#2f5496] text-white'
                  : s === step
                    ? 'bg-[#2f5496] text-white ring-4 ring-[#dbe4f6]'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            <span className={`text-[11px] mt-1.5 hidden sm:block ${s <= step ? 'text-[#2f5496] font-medium' : 'text-gray-400'}`}>
              {stepLabels[s - 1]}
            </span>
          </div>
          {s < 3 && (
            <div className="flex-1 h-0.5 mx-2 mb-4 sm:mb-0 rounded-full overflow-hidden bg-gray-100">
              <motion.div
                className="h-full bg-[#2f5496] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: s < step ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const viewVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

/* ------------------------------------------------------------------ */
/*  LOGIN                                                              */
/* ------------------------------------------------------------------ */
function LoginView({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError((e as Error).message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  /**
   * Connexion Google. Si un GOOGLE_CLIENT_ID est configuré côté backend,
   * on utilise le flux GIS réel ; sinon on affiche un message clair.
   */
  const handleGoogle = useCallback(async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { clientId } = await authApi.googleClientId();
      if (!clientId) {
        setError(
          "La connexion Google n'est pas encore configurée sur ce serveur (GOOGLE_CLIENT_ID manquant). Utilisez vos identifiants e-mail."
        );
        return;
      }
      // Chargement dynamique du SDK Google Identity Services.
      await new Promise<void>((resolve, reject) => {
        if ((window as any).google?.accounts?.id) return resolve();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Impossible de charger Google Sign-In.'));
        document.head.appendChild(s);
      });
      const idToken = await new Promise<string>((resolve, reject) => {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) resolve(response.credential);
            else reject(new Error('Connexion Google annulée.'));
          },
        });
        (window as any).google.accounts.id.prompt();
      });
      await loginWithGoogle(idToken);
    } catch (e) {
      setError((e as Error).message || 'Connexion Google impossible.');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle]);

  return (
    <motion.div key="login" {...viewVariants} transition={{ duration: 0.35, ease: 'easeInOut' }} className="space-y-5 w-full">
      <div className="text-center lg:text-left mb-2">
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight">Bon retour parmi nous</h1>
        <p className="text-gray-500 mt-1.5 text-[15px]">Connectez-vous à votre espace professionnel</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">Adresse e-mail professionnelle</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="votre.nom@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-pw" className="text-sm font-medium text-gray-700">Mot de passe</Label>
          <div className="relative">
            <Input
              id="login-pw"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] pr-11 text-[15px]"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            className="data-[state=checked]:bg-[#2f5496] data-[state=checked]:border-[#2f5496]"
          />
          <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">Se souvenir de moi</Label>
        </div>
        <button
          type="button"
          onClick={() => onSwitch('forgot')}
          className="text-sm text-[#2f5496] hover:text-[#1d3461] font-medium transition-colors"
        >
          Mot de passe oublié ?
        </button>
      </div>

      <Button
        onClick={handleLogin}
        disabled={loading || !email || !password}
        className="w-full h-11 bg-[#2f5496] hover:bg-[#26447d] text-white font-semibold rounded-lg text-[15px] transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {loading ? 'Connexion en cours…' : 'Se connecter'}
      </Button>

      <div className="relative flex items-center my-1">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">ou continuer avec</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Connexion Google — conservée */}
      <Button
        variant="outline"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full h-11 rounded-lg border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-[15px] font-medium text-gray-700 transition-all group"
      >
        {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <span className="mr-2.5 flex items-center"><GoogleIcon /></span>}
        {googleLoading ? 'Connexion en cours…' : 'Se connecter avec Google'}
      </Button>

      <p className="text-center text-sm text-gray-500 pt-1">
        Pas encore de compte ?{' '}
        <button
          type="button"
          onClick={() => onSwitch('register')}
          className="text-[#2f5496] hover:text-[#1d3461] font-semibold transition-colors"
        >
          Demander un accès
        </button>
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  REGISTER (3 étapes)                                                */
/* ------------------------------------------------------------------ */
function RegisterView({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const register = useAuthStore((s) => s.register);
  const [step, setStep] = useState<RegisterStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regPwConfirm, setRegPwConfirm] = useState('');

  const [headline, setHeadline] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');

  const [showRegPw, setShowRegPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const departments = [
    'Direction Générale', 'Ressources Humaines', 'Finance & Comptabilité',
    'Technologie & IT', 'Marketing & Communication', 'Commercial & Ventes',
    'Production & Opérations', 'Recherche & Développement', 'Juridique',
    'Logistique', 'Formation', 'Autre',
  ];

  const canProceedStep1 = firstName.trim() && lastName.trim() && regEmail.trim() && regPw && regPwConfirm;
  const canProceedStep2 = headline.trim() && company.trim();

  const handleNext = () => {
    if (step === 1) {
      if (regPw !== regPwConfirm) {
        setPwError('Les mots de passe ne correspondent pas');
        return;
      }
      if (regPw.length < 10) {
        setPwError('Le mot de passe doit contenir au moins 10 caractères');
        return;
      }
      setPwError('');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) {
      onSwitch('login');
    } else {
      setStep((s) => (s - 1) as RegisterStep);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      // Le backend gère email + prénom + nom + téléphone + mot de passe ; les
      // infos de l'étape 2 complètent le profil juste après la création.
      await register({
        email: regEmail.trim(), firstName: firstName.trim(), lastName: lastName.trim(),
        password: regPw, phone: regPhone.trim() || undefined,
      });
      // Compléter le profil avec les données de l'étape 2 (best effort)
      try {
        const { profilesApi } = await import('@/lib/api-services');
        const profile = await profilesApi.me();
        await profilesApi.update(profile.id, {
          jobTitle: headline,
          department: department || company,
          location: location || undefined,
        } as any);
      } catch {
        /* non bloquant */
      }
    } catch (e) {
      setError((e as Error).message || 'Création du compte impossible.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="register"
      {...viewVariants}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="w-full"
    >
      <div className="text-center lg:text-left mb-2">
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight">Rejoindre votre entreprise</h1>
        <p className="text-gray-500 mt-1.5 text-[15px]">
          {step === 1 && 'Créez votre compte professionnel'}
          {step === 2 && 'Complétez votre profil entreprise'}
          {step === 3 && 'Vérifiez vos informations'}
        </p>
      </div>

      <ProgressStepper step={step} />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="reg-s1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Prénom</Label>
                <Input
                  placeholder="Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nom</Label>
                <Input
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Adresse e-mail professionnelle</Label>
              <Input
                type="email"
                placeholder="votre.nom@entreprise.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Numéro de téléphone</Label>
              <Input
                type="tel"
                placeholder="Ex: +237 6XX XX XX XX"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Mot de passe</Label>
              <div className="relative">
                <Input
                  type={showRegPw ? 'text' : 'password'}
                  placeholder="Minimum 10 caractères"
                  value={regPw}
                  onChange={(e) => { setRegPw(e.target.value); setPwError(''); }}
                  className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] pr-11 text-[15px]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPw(!showRegPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showRegPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</Label>
              <Input
                type={showRegPw ? 'text' : 'password'}
                placeholder="Confirmez votre mot de passe"
                value={regPwConfirm}
                onChange={(e) => { setRegPwConfirm(e.target.value); setPwError(''); }}
                className={`h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px] ${pwError ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
              />
              {pwError && <p className="text-red-500 text-xs mt-1">{pwError}</p>}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="reg-s2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre professionnel</Label>
              <Input
                placeholder="Ex: Chef de projet IT"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Entreprise / Institution *</Label>
              <Input
                placeholder="Ex: Camtel SA, Université de Douala…"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Département / Service</Label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b6c9ed] focus:border-[#2f5496] transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Sélectionnez un département</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Localisation</Label>
              <Input
                placeholder="Ex: Douala, Cameroun"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="reg-s3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="rounded-xl border-gray-100 shadow-sm bg-gray-50/60 gap-0 py-0">
              <CardContent className="p-5 space-y-3.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Résumé du profil</p>

                <SummaryRow label="Nom complet" value={`${firstName} ${lastName}`} />
                <SummaryRow label="E-mail" value={regEmail} />
                <SummaryRow label="Téléphone" value={regPhone || '—'} />
                <div className="border-t border-gray-200/60 my-1" />
                <SummaryRow label="Titre" value={headline || '—'} />
                <SummaryRow label="Entreprise" value={company || '—'} />
                <SummaryRow label="Département" value={department || '—'} />
                <SummaryRow label="Localisation" value={location || '—'} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-11 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 font-medium flex-1 sm:flex-none px-5 text-[15px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour
        </Button>
        {step < 3 ? (
          <Button
            onClick={handleNext}
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            className="h-11 bg-[#2f5496] hover:bg-[#26447d] text-white font-semibold rounded-lg flex-1 sm:flex-none px-6 text-[15px] transition-colors"
          >
            Suivant
          </Button>
        ) : (
          <Button
            onClick={handleRegister}
            disabled={loading}
            className="h-11 bg-[#2f5496] hover:bg-[#26447d] text-white font-semibold rounded-lg flex-1 sm:flex-none px-6 text-[15px] transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? 'Création en cours…' : 'Créer mon compte'}
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-gray-500 pt-4">
        Déjà un compte ?{' '}
        <button
          type="button"
          onClick={() => onSwitch('login')}
          className="text-[#2f5496] hover:text-[#1d3461] font-semibold transition-colors"
        >
          Se connecter
        </button>
      </p>
    </motion.div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right break-words">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FORGOT PASSWORD                                                    */
/* ------------------------------------------------------------------ */
function ForgotPasswordView({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await authApi.requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError((e as Error).message || 'Envoi impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="forgot" {...viewVariants} transition={{ duration: 0.35, ease: 'easeInOut' }} className="w-full space-y-6">
      <div className="text-center lg:text-left mb-2">
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight">Mot de passe oublié ?</h1>
        <p className="text-gray-500 mt-1.5 text-[15px]">
          {sent
            ? 'Un e-mail de réinitialisation a été envoyé'
            : 'Entrez votre adresse e-mail pour recevoir un lien de réinitialisation'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div
            key="forgot-form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">Adresse e-mail professionnelle</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="votre.nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="h-11 rounded-lg border-gray-200 focus-visible:ring-[#b6c9ed] focus-visible:border-[#2f5496] text-[15px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !email}
              className="w-full h-11 bg-[#2f5496] hover:bg-[#26447d] text-white font-semibold rounded-lg text-[15px] transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="forgot-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center text-center py-4 space-y-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </motion.div>
            <div>
              <p className="text-gray-800 font-semibold text-lg">E-mail envoyé avec succès !</p>
              <p className="text-gray-500 text-sm mt-1">
                Vérifiez votre boîte de réception <span className="font-medium text-gray-700">{email}</span> pour le lien de réinitialisation.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => onSwitch('login')}
          className="inline-flex items-center gap-1.5 text-sm text-[#2f5496] hover:text-[#1d3461] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  AuthPage — 50/50 split                                             */
/* ------------------------------------------------------------------ */
export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  const switchView = useCallback((v: AuthView) => {
    setView(v);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      <LeftPanel />

      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-8 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <MobileLogo />

          <AnimatePresence mode="wait">
            {view === 'login' && <LoginView key="l" onSwitch={switchView} />}
            {view === 'register' && <RegisterView key="r" onSwitch={switchView} />}
            {view === 'forgot' && <ForgotPasswordView key="f" onSwitch={switchView} />}
          </AnimatePresence>

          {/* Environnement de dev local : l'API tourne ici */}
          <p className="hidden">{API_BASE_URL}</p>
        </div>
      </div>
    </div>
  );
}
