'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, UserX, ArrowLeft, Search, RefreshCw,
  AlertTriangle, Ban, CheckCircle2, Trash2, ChevronLeft, ChevronRight,
  Users, UserPlus, Wifi, Loader2, X, Gavel, Activity, UserCog,
  EllipsisVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api-services';
import type {
  AdminStats, AdminUserDetail, AdminWarning, UserAccountStatus, UserResponse,
} from '@/types';
import { useAuthStore, useNavigationStore, useAdminAuthStore } from '@/store';
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

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: 'Employé',
  ADMIN: 'Admin',
  SUPERADMIN: 'Superadmin',
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

function StatsBanner({ stats, onReload }: { stats: AdminStats | null; onReload: () => void }) {
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onReload} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Actualiser
        </Button>
      </div>
    </div>
  );
}

/* =========================== Filtres ===================================== */

function StatusFilter({
  value, onChange,
}: {
  value: UserAccountStatus | 'ALL';
  onChange: (v: UserAccountStatus | 'ALL') => void;
}) {
  const options: { value: UserAccountStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'SUSPENDED', label: 'Suspendus' },
    { value: 'BANNED', label: 'Bannis' },
    { value: 'DELETED', label: 'Supprimés' },
  ];
  return (
    <Select value={value} onValueChange={(v) => onChange(v as UserAccountStatus | 'ALL')}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Statut" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============================ Detail dialog =============================== */

function WarningDialog({
  user, onClose, onSubmitted,
}: {
  // Suffisant pour l'envoi (UserResponse de la liste ou AdminUserDetail du détail).
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
            Message officiel conservé dans l&apos;historique du compte. L&apos;utilisateur reçoit
            une notification in-app et un e-mail.
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

function DetailDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showWarn, setShowWarn] = useState(false);
  const [confirm, setConfirm] = useState<null | 'suspend' | 'ban' | 'reactivate' | 'delete'>(null);
  const [actionError, setActionError] = useState('');
  const currentUser = useAuthStore((s) => s.currentUser);
  const isSuperAdmin = !!currentUser?.isSuperAdmin;
  const [confirmRole, setConfirmRole] = useState<null | 'ADMIN' | 'EMPLOYEE'>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setDetail(await adminApi.detail(userId));
    } catch (e) {
      setDetail(null);
      setLoadError((e as Error).message || "Détail indisponible.");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const targetIsAdmin = detail ? detail.role === 'ADMIN' || detail.role === 'SUPERADMIN' : false;
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
              <>
                <Loader2 className="size-5 animate-spin" /> Chargement…
              </>
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
            {status !== 'DELETED' && (
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
                {status === 'SUSPENDED' && (
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
                {status === 'BANNED' && (
                  <Button variant="outline" size="sm" onClick={() => setConfirm('reactivate')} className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50">
                    <CheckCircle2 className="size-4" /> Lever le bannissement
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

            {/* Suppression : confirmation avec rappel de la suppression logique */}
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

            {/* Rôles : réservé au SUPERADMIN, jamais sur un SUPERADMIN ni soi-même */}
            {isSuperAdmin && detail.role !== 'SUPERADMIN' && currentUser?.id !== detail.id && (
              <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <UserCog className="size-3.5" /> Rôle du compte
                </p>
                <p className="text-muted-foreground">
                  Rôle actuel : <span className="font-medium text-foreground">{ROLE_LABEL[detail.role] ?? detail.role}</span>
                  {detail.role === 'ADMIN'
                    ? ' — retirer le rôle rendra ce compte employé standard.'
                    : ' — promouvoir ce compte lui donnera des droits d\'administration des utilisateurs.'}
                </p>
                {detail.role === 'ADMIN' ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmRole('EMPLOYEE')} className="gap-1.5">
                    <UserX className="size-4" /> Retirer le rôle Admin
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setConfirmRole('ADMIN')} className="gap-1.5">
                    <ShieldCheck className="size-4" /> Promouvoir Admin
                  </Button>
                )}
              </div>
            )}

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
                    {confirm === 'suspend' && 'L\'utilisateur ne pourra plus se connecter. Ses données sont conservées et le compte est réactivable.'}
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
                    {confirmRole === 'ADMIN' ? 'Promouvoir ce compte Admin ?' : 'Retirer le rôle Admin ?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirmRole === 'ADMIN'
                      ? 'Ce compte pourra gérer les comptes utilisateurs (avertissements, suspensions) depuis l\'espace d\'administration.'
                      : 'Ce compte redeviendra un compte employé standard et perdra l\'accès à l\'espace d\'administration.'}
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
              <WarningDialog
                user={detail}
                onClose={() => setShowWarn(false)}
                onSubmitted={load}
              />
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
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

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
            {isAdmin && (
              <span className="ml-2 text-[10px] font-semibold text-sky-800 bg-sky-100 rounded px-1.5 py-0.5 align-middle">
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
        ) : status === 'ACTIVE' && !isAdmin ? (
          <Button variant="ghost" size="sm" onClick={onQuickSuspend} title="Suspendre" className="text-orange-600 hover:bg-orange-50">
            <ShieldAlert className="size-4" />
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onOpen} title="Détail">
          <UserCog className="size-4" />
        </Button>
        {/* Menu visible de toutes les actions — elles n'étaient auparavant
            accessibles que depuis le dialogue de détail, sans indication. */}
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
              {!isAdmin && (
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

/* ============================== AdminPage ================================= */

const PAGE_SIZE = 20;

export function AdminPage() {
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isSuperAdmin = !!currentUser?.isSuperAdmin;
  const lockAdmin = useAdminAuthStore((s) => s.lock);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserAccountStatus | 'ALL'>('ALL');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [lastLoginFrom, setLastLoginFrom] = useState('');
  const [lastLoginTo, setLastLoginTo] = useState('');
  // Filtres avancés (dates) visibles par défaut : ils faisaient partie des
  // contenus « invisibles » signalés car repliés silencieusement.
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<null | { id: string; action: 'suspend' | 'reactivate' | 'ban' }>(null);
  const [warnUser, setWarnUser] = useState<null | { id: string; firstName: string; lastName: string }>(null);
  const [deleteUser, setDeleteUser] = useState<null | { id: string; firstName: string; lastName: string }>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminApi.stats());
      setStatsError('');
    } catch (e) {
      // Affiché sous les stats au lieu d'échouer silencieusement.
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
          registeredFrom: registeredFrom || undefined,
          registeredTo: registeredTo || undefined,
          lastLoginFrom: lastLoginFrom || undefined,
          lastLoginTo: lastLoginTo || undefined,
        },
        page,
        PAGE_SIZE,
      );
      setUsers(res.results);
      setCount(res.count);
      setNumPages(Math.max(1, res.numPages));
    } catch (e) {
      setError((e as Error).message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, registeredFrom, registeredTo, lastLoginFrom, lastLoginTo, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const submitSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
    setRegisteredFrom('');
    setRegisteredTo('');
    setLastLoginFrom('');
    setLastLoginTo('');
    setPage(0);
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
              Espace {isSuperAdmin ? 'Superadmin' : 'Admin'} — gestion des comptes utilisateurs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => { lockAdmin(); navigateTo('feed'); }}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Verrouiller
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <StatsBanner stats={stats} onReload={loadStats} />
      {statsError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          Statistiques : {statsError}
        </div>
      )}

      {/* Filtres */}
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
          <StatusFilter
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(0); }}
          />
          <Button
            variant="outline" size="sm"
            onClick={() => setShowAdvanced((s) => !s)}
            className="gap-1.5"
          >
            {showAdvanced ? <X className="size-3.5" /> : null}
            Filtres avancés
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>Réinitialiser</Button>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">Inscrit du</Label>
              <Input type="date" value={registeredFrom} onChange={(e) => { setRegisteredFrom(e.target.value); setPage(0); }} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inscrit au</Label>
              <Input type="date" value={registeredTo} onChange={(e) => { setRegisteredTo(e.target.value); setPage(0); }} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Connexion du</Label>
              <Input type="date" value={lastLoginFrom} onChange={(e) => { setLastLoginFrom(e.target.value); setPage(0); }} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Connexion au</Label>
              <Input type="date" value={lastLoginTo} onChange={(e) => { setLastLoginTo(e.target.value); setPage(0); }} className="h-9" />
            </div>
          </div>
        )}
      </div>

      {/* Liste */}
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

      {/* Pagination */}
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
        <DetailDialog userId={detailUserId} onClose={() => { setDetailUserId(null); loadUsers(); loadStats(); }} />
      )}

      {/* Confirmation action rapide (suspendre / réactiver / bannir depuis la liste) */}
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
                ? 'L\'utilisateur ne pourra plus se connecter. Ses données sont conservées et le compte est réactivable.'
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

      {/* Avertissement depuis la liste (réutilise le dialogue existant) */}
      {warnUser && (
        <WarningDialog
          user={warnUser}
          onClose={() => setWarnUser(null)}
          onSubmitted={loadUsers}
        />
      )}

      {/* Suppression logique depuis la liste */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Suppression logique : les données de {deleteUser?.firstName} {deleteUser?.lastName} sont anonymisées
              et le compte ne peut plus se connecter. Les échanges existants (messages, publications) sont conservés.
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
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
