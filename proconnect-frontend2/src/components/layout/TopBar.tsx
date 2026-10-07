'use client';

import { Search, Bell, Building2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useNavigationStore, useAuthStore, useNotificationStore, useSearchStore } from '@/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const setIsSearchOpen = useSearchStore((s) => s.setIsSearchOpen);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-sky-900 text-white">
            <Building2 className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            ProConnect
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Rechercher"
          >
            <Search className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative size-9"
            onClick={() => navigateTo('notifications')}
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-sky-900 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 focus:outline-none" aria-label="Menu utilisateur">
                  <Avatar className="size-8 ring-2 ring-transparent hover:ring-sky-200 transition-all">
                    {currentUser.avatar ? (
                      <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
                    ) : null}
                    <AvatarFallback className="bg-sky-100 text-sky-800 text-xs font-semibold">
                      {getInitials(currentUser.firstName, currentUser.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo('profile')}>Mon Profil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('settings')}>Paramètres</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
