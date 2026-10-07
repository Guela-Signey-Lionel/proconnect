'use client';

import { Home, Users, Briefcase, User, Plus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigationStore, useAuthStore } from '@/store';
import type { PageView } from '@/types';

interface MobileNavItem {
  label: string;
  icon: React.ReactNode;
  page: PageView;
  isCenter?: boolean;
}

const mobileNavItems: MobileNavItem[] = [
  { label: 'Accueil', icon: <Home className="size-5" />, page: 'feed' },
  { label: 'Réseau', icon: <Users className="size-5" />, page: 'network' },
  { label: 'Publier', icon: <Plus className="size-6" />, page: 'feed', isCenter: true },
  { label: 'Emplois', icon: <Briefcase className="size-5" />, page: 'jobs' },
  { label: 'Profil', icon: <User className="size-5" />, page: 'profile' },
];

export function MobileNav() {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const navigateTo = useNavigationStore((s) => s.navigateTo);
  const logout = useAuthStore((s) => s.logout);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = !item.isCenter && currentPage === item.page;

          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => navigateTo(item.page)}
                className="flex flex-col items-center justify-center gap-0.5 -mt-5"
                aria-label={item.label}
              >
                <span className="flex items-center justify-center size-12 rounded-full bg-sky-900 text-white shadow-lg shadow-sky-900/30 hover:bg-sky-800 active:scale-95 transition-all">
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigateTo(item.page)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px]',
                isActive
                  ? 'text-sky-800'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.label}
            >
              <span className={cn(isActive && 'text-sky-900')}>{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Déconnexion — visible uniquement en mobile/tablette */}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] text-muted-foreground hover:text-red-600"
          aria-label="Se déconnecter"
        >
          <LogOut className="size-5" />
          <span className="text-[10px] font-medium">Quitter</span>
        </button>
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
