'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, UserX, ArrowLeft, Search, RefreshCw,
  AlertTriangle, Ban, CheckCircle2, Trash2, ChevronLeft, ChevronRight,
  Users, UserPlus, Wifi, Loader2, Gavel, Activity, UserCog,
  EllipsisVertical, EyeOff, Eye, FileText, KeyRound, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api-services';
import type {
  AdminStats, AdminUserDetail, AdminWarning, UserAccountStatus, UserResponse,
  ModerationPost, ModerationComment, AdminActionEntry, AdminRole,
} from '@/types';
import { useAuthStore, useNavigationStore } from '@/store';
import { isoDate } from '@/lib/api-mappers';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

/* ============================== Helpers ================================== */

const STATUS_META: Record<UserAccountStatus, { label: string; badge: string }> = {
  ACTIVE: { label: 'Actif', badge: 'bg-green-100 text-green-700 border-green-200' },
  SUSPENDED: { label: 'Suspendu', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  BANNED: { label: 'Banni', badge: 'bg-red-100 text-red-700 border-red-200' },
  DELETED: { label: 'Supprimé', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const ROLE_LABEL: Record<AdminRole, string> = {
  EMPLOYEE: 'Employé',
  MODERATOR: 'Modérateur',
  ADMIN: 'Admin',
};

const ACTION_LABEL: Record<string, string> = {
  WARN: 'Avertissement',
  SUSPEND: 'Suspension',
  REACTIVATE: 'Réactivation',
  BAN: 'Bannissement',
  SOFT_DELETE: 'Suppression de compte',
  ROLE_CHANGE: 'Changement de rôle',
  PASSWORD_RESET: 'Réinitialisation MDP',
  HIDE_POST: 'Publication masquée',
  UNHIDE_POST: 'Publication restaurée',
  DELETE_POST: 'Publication supprimée',
  HIDE_COMMENT: 'Commentaire masqué',
  UNHIDE_COMMENT: 'Commentaire restauré',
  DELETE_COMMENT: 'Commentaire supprimé',
};

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(isoDate(value)).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(isoDate(value)).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getInitials(first?: string, last?: string): string {
  return `${(first ?? '?').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase();
}

/* ============================== Tabs ===================================== */

type AdminTab = 'users' | 'moderation' | 'logs' | 'stats';

function TabsBar({ tab, onTab, isAdmin, stats }: {
  tab: AdminTab; onTab: (t: AdminTab) => void; isAdmin: boolean; stats: AdminStats | null;
}) {
  const items: { id: AdminTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'users', label: 'Utilisateurs', icon: <Users className="size-4" />, show: isAdmin },
    { id: 'moderation', label: 'Modération', icon: <MessageSquare className="size-4" />, show: true },
    { id: 'logs', label: 'Journal', icon: <FileText className="size-4" />, show: isAdmin },
    { id: 'stats', label: 'Statistiques', icon: <Activity className="size-4" />, show: true },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {items.filter((i) => i.show).map((item) => (
        <button
          key={item.id}
          onClick={() => onTab(item.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === item.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.icon}
          {item.label}
          {item.id === 'moderation' && stats && (stats.hiddenPosts + stats.hiddenComments) > 0 && (
            <span className="ml-1 rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
              {stats.hiddenPosts + stats.hiddenComments}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ============================== Stats ==================================== */

function StatCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode; label: string; value: number | string; tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className={cn('flex items-center justify-center size-10 rounded-lg shrink-0', tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function StatsView({ stats, onReload, error }: { stats: AdminStats | null; onReload: () => void; error: string }) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
        Statistiques : {error}
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Chargement des statistiques…
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="size-5 text-white" />} label="Utilisateurs" value={stats.totalUsers} tone="bg-sky-900" />
        <StatCard icon={<UserPlus className="size-5 text-white" />} label="Nouveaux aujourd'hui" value={stats.newToday} tone="bg-emerald-600" />
        <StatCard icon={<ShieldAlert className="size-5 text-white" />} label="Suspendus" value={stats.suspendedAccounts} tone="bg-orange-500" />
        <StatCard icon={<Ban className="size-5 text-white" />} label="Bannis" value={stats.bannedAccounts} tone="bg-red-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<UserPlus className="size-5 text-white" />} label="Nouveaux (7 j)" value={stats.newLast7Days} tone="bg-sky-700" />
        <StatCard icon={<UserPlus className="size-5 text-white" />} label="Nouveaux (30 j)" value={stats.newLast30Days} tone="bg-indigo-600" />
        <StatCard icon={<UserX className="size-5 text-white" />} label="Supprimés" value={stats.deletedAccounts} tone="bg-gray-500" />
        <StatCard icon={<Wifi className="size-5 text-white" />} label="En ligne maintenant" value={stats.onlineNow} tone="bg-green-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<UserCog className="size-5 text-white" />} label="Admins" value={stats.adminCount} tone="bg-indigo-800" />
        <StatCard icon={<Gavel className="size-5 text-white" />} label="Modérateurs" value={stats.moderatorCount} tone="bg-teal-600" />
        <StatCard icon={<EyeOff className="size-5 text-white" />} label="Publications masquées" value={stats.hiddenPosts} tone="bg-orange-700" />
        <StatCard icon={<EyeOff className="size-5 text-white" />} label="Commentaires masqués" value={stats.hiddenComments} tone="bg-rose-700" />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onReload} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Actualiser
        </Button>
      </div>
    </div>
  );
}

/* =========================== Détail utilisateur ========================== */

function WarningDialog({
  user, onClose, onSubmitted,
}: {
  user: Pick<AdminUserDetail, 'id' | 'firstName' | 'lastName'>;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError('');
    try {
      await adminApi.warn(user.id, reason.trim(), message.trim() || undefined);
      onSubmitted();
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Envoi impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-orange-500" /> Avertir {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            Message officiel conservé dans l&apos;historique du compte et le journal.
            L&apos;utilisateur reçoit une notification in-app et un e-mail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motif (requis)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : propos inappropriés dans un commentaire"
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label>Message officiel (optionnel)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Détail du message transmis à l'utilisateur…"
              rows={4}
              maxLength={4000}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              onClick={submit}
              disabled={loading || !reason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              Envoyer l&apos;avertissement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user, onClose,
}: {
  user: Pick<AdminUserDetail, 'id' | 'firstName' | 'lastName'>;
  onClose: () => void;
}) {
  const [optional, setOptional] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.resetPassword(
        user.id, optional.trim() && optional.trim().length >= 12 ? optional.trim() : undefined
      );
      setTempPassword(res.temporaryPassword);
    } catch (e) {
      setError((e as Error).message || 'Réinitialisation impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-sky-600" /> Réinitialiser le mot de passe
          </DialogTitle>
          <DialogDescription>
            {tempPassword
              ? 'Le mot de passe temporaire doit être communiqué à l\'utilisateur via un canal externe. Il devra le changer à sa prochaine connexion.'
              : 'Laissez vide pour générer automatiquement un mot de passe temporaire. L\'utilisateur devra le changer à sa prochaine connexion.'}
          </DialogDescription>
        </DialogHeader>
        {!tempPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe (optionnel, min. 12 caractères)</Label>
              <Input
                value={optional}
                onChange={(e) => setOptional(e.target.value)}
                placeholder="Généré automatiquement si vide"
                maxLength={72}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={submit} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Réinitialiser
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
              <p className="text-xs text-sky-800 mb-1 font-medium">Mot de passe temporaire (à communiquer à l&apos;utilisateur) :</p>
              <p className="font-mono text-sm font-bold text-sky-900 break-all select-all">{tempPassword}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  userId, onClose, canManageUsers,
}: {
  userId: string; onClose: () => void; canManageUsers: boolean;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showWarn, setShowWarn] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirm, setConfirm] = useState<null | 'suspend' | 'ban' | 'reactivate' | 'delete'>(null);
  const [actionError, setActionError] = useState('');
  const currentUser = useAuthStore((s) => s.currentUser);
  const [confirmRole, setConfirmRole] = useState<null | AdminRole>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setDetail(await adminApi.detail(userId));
    } catch (e) {
      setDetail(null);
      setLoadError((e as Error).message || "Détail indisponible.");
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!confirm || !detail) return;
    setActionError('');
    try {
      if (confirm === 'suspend') await adminApi.suspend(detail.id);
      if (confirm === 'ban') await adminApi.ban(detail.id);
      if (confirm === 'reactivate') await adminApi.reactivate(detail.id);
      if (confirm === 'delete') await adminApi.deleteUser(detail.id);
      setConfirm(null);
      if (confirm === 'delete') {
        onClose();
        return;
      }
      await load();
    } catch (e) {
      setActionError((e as Error).message || 'Action impossible.');
    }
  };

  const targetIsAdmin = detail ? detail.role === 'ADMIN' || detail.role === 'MODERATOR' : false;
  const status = detail?.status ?? 'ACTIVE';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {!detail ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            {loadError ? (
              <>
                <p className="text-sm text-red-600">{loadError}</p>
                <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                  <RefreshCw className="size-3.5" /> Réessayer
                </Button>
              </>
            ) : (
              <><Loader2 className="size-5 animate-spin" /> Chargement…</>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="size-10">
                  {detail.avatarUrl ? <AvatarImage src={detail.avatarUrl} alt={detail.firstName} /> : null}
                  <AvatarFallback className="bg-sky-100 text-sky-800 text-sm font-semibold">
                    {getInitials(detail.firstName, detail.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{detail.fullName}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_META[status].badge)}>
                  {STATUS_META[status].label}
                </span>
                <span className="text-xs text-muted-foreground font-normal">{ROLE_LABEL[detail.role] ?? detail.role}</span>
              </DialogTitle>
              <DialogDescription className="truncate">{detail.email}</DialogDescription>
            </DialogHeader>

            {/* Actions */}
            {canManageUsers && status !== 'DELETED' && (
              <div className="flex flex-wrap gap-2">
                {!targetIsAdmin && (
                  <Button
                    variant="outline" size="sm" onClick={() => setShowWarn(true)}
                    className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <AlertTriangle className="size-4" /> Avertir
                  </Button>
                )}
                {status === 'ACTIVE' && !targetIsAdmin && (
                  <Button
                    variant="outline" size="sm" onClick={() => setConfirm('suspend')}
                    className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <ShieldAlert className="size-4" /> Suspendre
                  </Button>
                )}
                {status !== 'ACTIVE' && (
                  <Button variant="outline" size="sm" onClick={() => setConfirm('reactivate')} className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50">
                    <CheckCircle2 className="size-4" /> Réactiver
                  </Button>
                )}
                {status !== 'BANNED' && !targetIsAdmin && (
                  <Button
                    variant="outline" size="sm" onClick={() => setConfirm('ban')}
                    className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Ban className="size-4" /> Bannir
                  </Button>
                )}
                {!targetIsAdmin && (
                  <Button
                    variant="outline" size="sm" onClick={() => setShowReset(true)}
                    className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    <KeyRound className="size-4" /> Réinitialiser le MDP
                  </Button>
                )}
                {!targetIsAdmin && (
                  <Button
                    variant="outline" size="sm" onClick={() => setConfirm('delete')}
                    className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" /> Supprimer
                  </Button>
                )}
              </div>
            )}
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}

            {/* Infos compte */}
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compte</p>
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="Inscrit le" value={fmtDate(detail.createdAt)} />
                <InfoRow label="Dernière connexion" value={fmtDateTime(detail.lastLoginAt)} />
                <InfoRow label="Dernière activité" value={fmtDateTime(detail.lastSeenAt)} />
                <InfoRow label="Téléphone" value={detail.phone ?? '—'} />
                <InfoRow label="Poste" value={detail.jobTitle ?? '—'} />
                <InfoRow label="Département" value={detail.department ?? '—'} />
                <InfoRow label="Localisation" value={detail.location ?? '—'} />
                <InfoRow label="MDP à changer" value={detail.mustChangePassword ? 'Oui' : 'Non'} />
              </div>
            </div>

            {/* Activité */}
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="size-3.5" /> Activité
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{detail.postsCount}</p>
                  <p className="text-xs text-muted-foreground">Publications</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{detail.commentsCount}</p>
                  <p className="text-xs text-muted-foreground">Commentaires</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{detail.messagesCount}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
              </div>
            </div>

            {/* Avertissements */}
            <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="size-3.5" /> Avertissements reçus ({detail.warnings.length})
              </p>
              {detail.warnings.length === 0 ? (
                <p className="text-muted-foreground">Aucun avertissement.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.warnings.map((w: AdminWarning) => (
                    <li key={w.id} className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                      <p className="font-medium text-orange-800">{w.reason}</p>
                      {w.message && <p className="text-orange-700 mt-1 whitespace-pre-wrap">{w.message}</p>}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {fmtDateTime(w.createdAt)}
                        {w.issuedByName ? ` — par ${w.issuedByName}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Rôles : réservé aux admins, jamais sur soi-même */}
            {canManageUsers && detail.role !== 'ADMIN' && currentUser?.id !== detail.id && (
              <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <UserCog className="size-3.5" /> Rôle du compte
                </p>
                <p className="text-muted-foreground">
                  Rôle actuel : <span className="font-medium text-foreground">{ROLE_LABEL[detail.role] ?? detail.role}</span>
                  {' — '}MODERATOR accède au panneau de modération ; ADMIN gère en plus les comptes Utilisateurs.
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.role !== 'MODERATOR' && (
                    <Button variant="outline" size="sm" onClick={() => setConfirmRole('MODERATOR')} className="gap-1.5">
                      <Gavel className="size-4" /> Promouvoir Modérateur
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setConfirmRole('ADMIN')} className="gap-1.5">
                    <ShieldCheck className="size-4" /> Promouvoir Admin
                  </Button>
                </div>
              </div>
            )}

            {/* Suppression logique du compte */}
            <AlertDialog open={confirm === 'delete'} onOpenChange={(o) => !o && setConfirm(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Suppression <strong>logique</strong> : le compte sera marqué « supprimé » et ses
                    données personnelles anonymisées. Les messages et publications déjà échangés
                    restent visibles pour ne pas casser les conversations des autres utilisateurs.
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runAction}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Confirmations suspendre / bannir / réactiver */}
            <AlertDialog
              open={confirm === 'suspend' || confirm === 'ban' || confirm === 'reactivate'}
              onOpenChange={(o) => !o && setConfirm(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {confirm === 'suspend' && 'Suspendre ce compte ?'}
                    {confirm === 'ban' && 'Bannir durablement ce compte ?'}
                    {confirm === 'reactivate' && 'Réactiver ce compte ?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirm === 'suspend' && 'L\'utilisateur ne pourra plus se connecter ni publier. Ses données sont conservées et le compte est réactivable.'}
                    {confirm === 'ban' && 'L\'utilisateur ne pourra plus jamais se connecter. Ses données sont conservées.'}
                    {confirm === 'reactivate' && 'L\'utilisateur retrouvera l\'accès à son compte.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={runAction}>Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Confirmation changement de rôle */}
            <AlertDialog open={!!confirmRole} onOpenChange={(o) => !o && setConfirmRole(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {confirmRole === 'ADMIN' ? 'Promouvoir ce compte Admin ?' : 'Promouvoir ce compte Modérateur ?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirmRole === 'ADMIN'
                      ? 'Ce compte pourra gérer les comptes utilisateurs (avertissements, suspensions, rôles) et modérer le contenu.'
                      : 'Ce compte pourra uniquement masquer ou supprimer publications et commentaires (panneau de modération).'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!confirmRole || !detail) return;
                      setActionError('');
                      try {
                        await adminApi.setRole(detail.id, confirmRole);
                        setConfirmRole(null);
                        await load();
                      } catch (e) {
                        setActionError((e as Error).message || 'Changement de rôle impossible.');
                      }
                    }}
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {showWarn && (
              <WarningDialog user={detail} onClose={() => setShowWarn(false)} onSubmitted={load} />
            )}
            {showReset && (
              <ResetPasswordDialog user={detail} onClose={() => { setShowReset(false); load(); }} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}

/* ============================ Modération ================================= */

function ModerationView({ isAdmin }: { isAdmin: boolean }) {
  const [listKind, setListKind] = useState<'posts' | 'comments'>('posts');
  const [hiddenFilter, setHiddenFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | {
    kind: 'hidePost' | 'unhidePost' | 'deletePost' | 'hideComment' | 'unhideComment' | 'deleteComment';
    id: string;
  }>(null);

  const hidden = hiddenFilter === 'VISIBLE' ? false : hiddenFilter === 'HIDDEN' ? true : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (listKind === 'posts') {
        const res = await adminApi.moderationPosts({ hidden, search: search || undefined }, page, 15);
        setPosts(res.results);
        setCount(res.count);
        setNumPages(Math.max(1, res.numPages));
      } else {
        const res = await adminApi.moderationComments({ hidden, search: search || undefined }, page, 15);
        setComments(res.results);
        setCount(res.count);
        setNumPages(Math.max(1, res.numPages));
      }
    } catch (e) {
      setError((e as Error).message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [listKind, hidden, search, page]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!confirmAction) return;
    try {
      switch (confirmAction.kind) {
        case 'hidePost': await adminApi.hidePost(confirmAction.id); break;
        case 'unhidePost': await adminApi.unhidePost(confirmAction.id); break;
        case 'deletePost': await adminApi.deleteModerationPost(confirmAction.id); break;
        case 'hideComment': await adminApi.hideComment(confirmAction.id); break;
        case 'unhideComment': await adminApi.unhideComment(confirmAction.id); break;
        case 'deleteComment': await adminApi.deleteModerationComment(confirmAction.id); break;
      }
      setConfirmAction(null);
      await load();
    } catch (e) {
      setError((e as Error).message || 'Action impossible.');
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button variant={listKind === 'posts' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setListKind('posts'); setPage(0); }}>
            Publications
          </Button>
          <Button variant={listKind === 'comments' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setListKind('comments'); setPage(0); }}>
            Commentaires
          </Button>
        </div>
        <Select value={hiddenFilter} onValueChange={(v) => { setHiddenFilter(v as typeof hiddenFilter); setPage(0); }}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous</SelectItem>
            <SelectItem value="VISIBLE">Visibles</SelectItem>
            <SelectItem value="HIDDEN">Masqués</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage(0); } }}
            placeholder={listKind === 'posts' ? 'Rechercher dans les publications…' : 'Rechercher dans les commentaires…'}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : listKind === 'posts' ? (
        posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucune publication ne correspond.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className={cn(
                'rounded-lg border border-border p-3',
                p.hidden && 'bg-orange-50/60 border-orange-200'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.author.fullName}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{p.author.email}</span>
                    </p>
                    <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">{p.content ?? '(sans texte)'}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {fmtDateTime(p.createdAt)} · {p.visibleCommentsCount} commentaire(s)
                      {p.attachments?.length > 0 && ` · ${p.attachments.length} pièce(s) jointe(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.hidden ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">Masqué</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-200">Visible</span>
                    )}
                    <Button
                      variant="ghost" size="sm" title={p.hidden ? 'Restaurer' : 'Masquer'}
                      onClick={() => setConfirmAction({ kind: p.hidden ? 'unhidePost' : 'hidePost', id: p.id })}
                      className="text-orange-600 hover:bg-orange-50"
                    >
                      {p.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" title="Supprimer définitivement" onClick={() => setConfirmAction({ kind: 'deletePost', id: p.id })} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun commentaire ne correspond.</div>
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className={cn(
                'rounded-lg border border-border p-3',
                c.hidden ? 'bg-orange-50/60 border-orange-200' : ''
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getInitials((c.author.fullName ?? '').split(' ')[0], (c.author.fullName ?? '').split(' ').slice(1).join(' '))}
                      {c.author.fullName}
                    </p>
                    <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap line-clamp-3">
                      {c.sticker ? `Sticker : ${c.sticker}` : c.content ?? '(vide)'}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{fmtDateTime(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.hidden ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">Masqué</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-200">Visible</span>
                    )}
                    <Button
                      variant="ghost" size="sm" title={c.hidden ? 'Restaurer' : 'Masquer'}
                      onClick={() => setConfirmAction({ kind: c.hidden ? 'unhideComment' : 'hideComment', id: c.id })}
                      className="text-orange-600 hover:bg-orange-50"
                    >
                      {c.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" title="Supprimer définitivement" onClick={() => setConfirmAction({ kind: 'deleteComment', id: c.id })} className="text-red-600 hover:bg-red-50">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {numPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{count} élément(s) — page {page + 1} / {numPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1">
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= numPages - 1} onClick={() => setPage((p) => p + 1)} className="gap-1">
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind.startsWith('delete')
                ? 'Supprimer définitivement ?'
                : confirmAction?.kind.startsWith('hide')
                ? 'Masquer ce contenu ?'
                : 'Restaurer ce contenu ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind.startsWith('delete')
                ? 'Cette action est IRRÉVERSIBLE : le contenu sera définitivement effacé avec ses dépendances.'
                : confirmAction?.kind.startsWith('hide')
                ? 'Le contenu sera retiré du fil pour tous les utilisateurs. Il reste en base et peut être restauré à tout moment.'
                : 'Le contenu redeviendra visible dans le fil pour tous les utilisateurs.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={runAction}
              className={confirmAction?.kind.startsWith('delete') ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================== Journal ================================== */

function LogsView() {
  const [entries, setEntries] = useState<AdminActionEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.actions(
        typeFilter === 'ALL' ? {} : { actionType: typeFilter }, page, 25
      );
      setEntries(res.results);
      setCount(res.count);
      setNumPages(Math.max(1, res.numPages));
    } catch (e) {
      setError((e as Error).message || 'Chargement du journal impossible.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[240px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types d&apos;action</SelectItem>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Chargement du journal…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune action enregistrée.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-xs px-2 py-0.5 rounded border bg-muted">
                      {ACTION_LABEL[entry.actionType] ?? entry.actionType}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">{entry.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Par <span className="font-medium">{entry.actorName ?? '—'}</span>
                    {entry.targetUserName && <> — compte concerné : <span className="font-medium">{entry.targetUserName}</span></>}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{fmtDateTime(entry.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {numPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{count} action(s) — page {page + 1} / {numPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1">
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= numPages - 1} onClick={() => setPage((p) => p + 1)} className="gap-1">
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Page Admin ================================= */

const PAGE_SIZE = 20;

export function AdminPage() {
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = !!currentUser?.isAdmin;

  const [tab, setTab] = useState<AdminTab>(isAdmin ? 'users' : 'moderation');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserAccountStatus | 'ALL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<null | { id: string; action: 'suspend' | 'reactivate' | 'ban' }>(null);
  const [warnUser, setWarnUser] = useState<null | { id: string; firstName: string; lastName: string }>(null);
  const [deleteUser, setDeleteUser] = useState<null | { id: string; firstName: string; lastName: string }>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminApi.stats());
      setStatsError('');
    } catch (e) {
      setStatsError((e as Error).message || 'Statistiques indisponibles.');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.users(
        {
          search,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        },
        page,
        PAGE_SIZE,
      );
      // Filtre de rôle côté client (peu de comptes concernés).
      setUsers(res.results.filter((u) => roleFilter === 'ALL' || u.role === roleFilter));
      setCount(res.count);
      setNumPages(Math.max(1, res.numPages));
    } catch (e) {
      setError((e as Error).message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (tab === 'users' && isAdmin) loadUsers();
  }, [tab, isAdmin, loadUsers]);

  const submitSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const runQuickAction = async () => {
    if (!confirmUser) return;
    try {
      if (confirmUser.action === 'suspend') await adminApi.suspend(confirmUser.id);
      else if (confirmUser.action === 'ban') await adminApi.ban(confirmUser.id);
      else await adminApi.reactivate(confirmUser.id);
      await loadUsers();
      await loadStats();
    } catch (e) {
      setError((e as Error).message || 'Action impossible.');
    } finally {
      setConfirmUser(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-sky-900 text-white shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Administration</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des utilisateurs, modération, journal et statistiques
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => navigateTo('feed')}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Retour
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <TabsBar tab={tab} onTab={setTab} isAdmin={isAdmin} stats={stats} />

      {/* Contenu selon l'onglet */}
      {tab === 'stats' && <StatsView stats={stats} onReload={loadStats} error={statsError} />}
      {tab === 'moderation' && <ModerationView isAdmin={isAdmin} />}
      {tab === 'logs' && isAdmin && <LogsView />}

      {/* Onglet Utilisateurs */}
      {tab === 'users' && isAdmin && (
        <>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                  placeholder="Rechercher par nom ou e-mail…"
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as UserAccountStatus | 'ALL'); setPage(0); }}>
                <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="ACTIVE">Actifs</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendus</SelectItem>
                  <SelectItem value="BANNED">Bannis</SelectItem>
                  <SelectItem value="DELETED">Supprimés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as AdminRole | 'ALL'); setPage(0); }}>
                <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les rôles</SelectItem>
                  <SelectItem value="EMPLOYEE">Employés</SelectItem>
                  <SelectItem value="MODERATOR">Modérateurs</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter('ALL'); setRoleFilter('ALL'); setPage(0); }}>
                Réinitialiser
              </Button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Users className="size-5 text-white" />} label="Utilisateurs" value={stats.totalUsers} tone="bg-sky-900" />
              <StatCard icon={<UserPlus className="size-5 text-white" />} label="Nouveaux aujourd'hui" value={stats.newToday} tone="bg-emerald-600" />
              <StatCard icon={<ShieldAlert className="size-5 text-white" />} label="Suspendus" value={stats.suspendedAccounts} tone="bg-orange-500" />
              <StatCard icon={<Ban className="size-5 text-white" />} label="Bannis" value={stats.bannedAccounts} tone="bg-red-600" />
            </div>
          )}
          {statsError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              Statistiques : {statsError}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Chargement des comptes…
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun compte ne correspond aux filtres.</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onOpen={() => setDetailUserId(u.id)}
                  onQuickSuspend={() => setConfirmUser({ id: u.id, action: 'suspend' })}
                  onQuickReactivate={() => setConfirmUser({ id: u.id, action: 'reactivate' })}
                  onQuickBan={() => setConfirmUser({ id: u.id, action: 'ban' })}
                  onWarn={() => setWarnUser({ id: u.id, firstName: u.firstName, lastName: u.lastName })}
                  onDelete={() => setDeleteUser({ id: u.id, firstName: u.firstName, lastName: u.lastName })}
                />
              ))}
            </div>
          )}

          {numPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {count} compte(s) — page {page + 1} / {numPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1">
                  <ChevronLeft className="size-4" /> Précédent
                </Button>
                <Button variant="outline" size="sm" disabled={page >= numPages - 1} onClick={() => setPage((p) => p + 1)} className="gap-1">
                  Suivant <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Détail utilisateur */}
          {detailUserId && (
            <DetailDialog
              userId={detailUserId}
              canManageUsers={isAdmin}
              onClose={() => { setDetailUserId(null); loadUsers(); loadStats(); }}
            />
          )}

          {/* Confirmation action rapide */}
          <AlertDialog open={!!confirmUser} onOpenChange={(o) => !o && setConfirmUser(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmUser?.action === 'suspend' ? 'Suspendre ce compte ?'
                    : confirmUser?.action === 'ban' ? 'Bannir durablement ce compte ?'
                    : 'Réactiver ce compte ?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmUser?.action === 'suspend'
                    ? 'L\'utilisateur ne pourra plus se connecter ni publier. Ses données sont conservées et le compte est réactivable.'
                    : confirmUser?.action === 'ban'
                    ? 'Le bannissement est définitif : l\'utilisateur ne pourra plus jamais se connecter.'
                    : 'L\'utilisateur retrouvera l\'accès à son compte.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={runQuickAction}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Avertissement depuis la liste */}
          {warnUser && (
            <WarningDialog user={warnUser} onClose={() => setWarnUser(null)} onSubmitted={loadUsers} />
          )}

          {/* Suppression logique depuis la liste */}
          <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Suppression logique : les données de {deleteUser?.firstName} {deleteUser?.lastName} sont anonymisées
                  et le compte ne peut plus se connecter. Les échanges existants (messages, publications) sont conservés
                  pour ne pas casser les conversations des autres utilisateurs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!deleteUser) return;
                    try {
                      await adminApi.deleteUser(deleteUser.id);
                    } catch (e) {
                      setError((e as Error).message || 'Suppression impossible.');
                    }
                    setDeleteUser(null);
                    await loadUsers();
                    await loadStats();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

/* ============================ Ligne utilisateur =========================== */

function UserRow({
  user, onOpen, onQuickSuspend, onQuickReactivate, onQuickBan, onWarn, onDelete,
}: {
  user: UserResponse;
  onOpen: () => void;
  onQuickSuspend: () => void;
  onQuickReactivate: () => void;
  onQuickBan: () => void;
  onWarn: () => void;
  onDelete: () => void;
}) {
  const status = (user.status ?? 'ACTIVE') as UserAccountStatus;
  const meta = STATUS_META[status];
  const isStaff = user.role === 'ADMIN' || user.role === 'MODERATOR';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
      <button onClick={onOpen} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <Avatar className="size-9 shrink-0">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.firstName} /> : null}
          <AvatarFallback className="bg-sky-100 text-sky-800 text-xs font-semibold">
            {getInitials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
            {isStaff && (
              <span className={cn(
                'ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5 align-middle',
                user.role === 'ADMIN' ? 'text-sky-800 bg-sky-100' : 'text-teal-800 bg-teal-100'
              )}>
                {ROLE_LABEL[user.role]}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </button>

      <div className="hidden sm:block text-right shrink-0">
        <p className="text-xs text-muted-foreground">Inscrit : {fmtDate(user.createdAt)}</p>
        <p className="text-xs text-muted-foreground">Dern. conn. : {fmtDate(user.lastLoginAt)}</p>
      </div>

      <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', meta.badge)}>
        {meta.label}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        {status === 'SUSPENDED' ? (
          <Button variant="ghost" size="sm" onClick={onQuickReactivate} title="Réactiver" className="text-green-700 hover:bg-green-50">
            <CheckCircle2 className="size-4" />
          </Button>
        ) : status === 'ACTIVE' && !isStaff ? (
          <Button variant="ghost" size="sm" onClick={onQuickSuspend} title="Suspendre" className="text-orange-600 hover:bg-orange-50">
            <ShieldAlert className="size-4" />
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onOpen} title="Détail">
          <UserCog className="size-4" />
        </Button>
        {status !== 'DELETED' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title="Actions" aria-label={`Actions pour ${user.firstName} ${user.lastName}`}>
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={onOpen}>
                <UserCog className="size-4" /> Voir le détail
              </DropdownMenuItem>
              {!isStaff && (
                <>
                  <DropdownMenuItem onSelect={onWarn} className="text-orange-700 focus:text-orange-800">
                    <AlertTriangle className="size-4" /> Avertir
                  </DropdownMenuItem>
                  {status === 'ACTIVE' && (
                    <DropdownMenuItem onSelect={onQuickSuspend} className="text-orange-700 focus:text-orange-800">
                      <ShieldAlert className="size-4" /> Suspendre
                    </DropdownMenuItem>
                  )}
                  {status !== 'BANNED' && (
                    <DropdownMenuItem onSelect={onQuickBan} className="text-red-700 focus:text-red-800">
                      <Ban className="size-4" /> Bannir
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onDelete} className="text-red-700 focus:text-red-800">
                    <Trash2 className="size-4" /> Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
