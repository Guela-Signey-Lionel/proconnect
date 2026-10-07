'use client';

import {
  Home,
  Users,
  Briefcase,
  MessageSquare,
  Bell,
  User,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useNavigationStore, useAuthStore, useNotificationStore } from '@/store';
import type { PageView } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page: PageView;
}

const navItems: NavItem[] = [
  { label: 'Accueil', icon: <Home className="size-5" />, page: 'feed' },
  { label: 'Réseau', icon: <Users className="size-5" />, page: 'network' },
  { label: 'Emplois', icon: <Briefcase className="size-5" />, page: 'jobs' },
  { label: 'Messagerie', icon: <MessageSquare className="size-5" />, page: 'messaging' },
  { label: 'Notifications', icon: <Bell className="size-5" />, page: 'notifications' },
  { label: 'Profil', icon: <User className="size-5" />, page: 'profile' },
  { label: 'Paramètres', icon: <Settings className="size-5" />, page: 'settings' },
];

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const navigateTo = useNavigationStore((s) => s.navigateTo);

  const button = (
    <button
      onClick={() => navigateTo(item.page)}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left',
        isActive
          ? 'bg-sky-100 text-sky-800'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="hidden lg:block truncate">{item.label}</span>
    </button>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="lg:hidden">{button}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
      <div className="hidden lg:block">{button}</div>
    </>
  );
}

export function LeftSidebar() {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const currentUser = useAuthStore((s) => s.currentUser);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const logout = useAuthStore((s) => s.logout);

  if (!currentUser) return null;

  const canOpenAdmin = !!currentUser.isAdmin || !!currentUser.isModerator;

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-background z-30 w-16 lg:w-60 shrink-0">
      {/* Marque */}
      <div className="flex items-center gap-2 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="ProConnect" className="size-9 shrink-0" />
        <span className="hidden lg:block text-lg font-bold tracking-tight text-foreground">
          ProConnect
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;

          if (item.page === 'notifications' && unreadCount > 0) {
            return (
              <div key={item.page} className="relative">
                <NavButton item={item} isActive={isActive} />
                <span className="absolute top-1.5 right-1.5 lg:right-auto lg:left-8 flex items-center justify-center size-5 rounded-full bg-sky-900 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            );
          }

          return <NavButton key={item.page} item={item} isActive={isActive} />;
        })}

        {/* Espace d'administration — visible uniquement des comptes ADMIN / MODERATOR */}
        {canOpenAdmin && (
          <div className="pt-2 mt-2 border-t border-border">
            <NavButton
              item={{
                label: 'Administration',
                icon: <ShieldCheck className="size-5" />,
                page: 'admin',
              }}
              isActive={currentPage === 'admin'}
            />
          </div>
        )}
      </nav>

      <Separator />

      {/* Mini profil + déconnexion */}
      <div className="px-3 py-4 space-y-1">
        <button
          onClick={() => useNavigationStore.getState().navigateTo('profile')}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-left hover:bg-muted transition-colors"
        >
          <Avatar className="size-9 shrink-0">
            {currentUser.avatar ? (
              <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
            ) : null}
            <AvatarFallback className="bg-sky-100 text-sky-800 text-xs font-semibold">
              {getInitials(currentUser.firstName, currentUser.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-medium truncate">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentUser.headline ?? currentUser.email}
            </p>
          </div>
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
            >
              <LogOut className="size-5 shrink-0" />
              <span className="hidden lg:block">Déconnexion</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p>Déconnexion</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
