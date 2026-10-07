'use client';

import { cn } from '@/lib/utils';

/**
 * Pastille verte « en ligne » — se superpose au coin bas-droit d'un avatar.
 * Affichée uniquement quand l'utilisateur est en ligne (rien sinon).
 *
 * Rendu purément décoratif : pointer-events-none pour ne jamais gêner le clic
 * sur l'avatar/bouton parent.
 */
export function OnlineIndicator({
  online,
  className,
  size = 'md',
  ring = 'ring-background',
}: {
  online: boolean;
  className?: string;
  /** sm = avatars de liste, md = 12-14, lg = avatar de profil (24). */
  size?: 'sm' | 'md' | 'lg';
  /** Classe de l'anneau (couleur du contour) — à adapter au fond local. */
  ring?: string;
}) {
  if (!online) return null;

  const sizeClass = { sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-5 w-5' }[size];

  return (
    <span
      aria-label="En ligne"
      title="En ligne"
      className={cn(
        'pointer-events-none absolute bottom-0 right-0 z-10 translate-x-[15%] translate-y-[15%]',
        'block rounded-full bg-emerald-500 ring-2',
        ring,
        sizeClass,
        className
      )}
    />
  );
}

/**
 * Avatar avec pastille de présence intégrée — raccourci pour les listes.
 * Accepte les mêmes props que Avatar + `online`.
 */
export function PresenceAvatar({
  online,
  children,
  className,
  indicatorSize = 'md',
  ring,
}: {
  online: boolean;
  children: React.ReactNode;
  className?: string;
  indicatorSize?: 'sm' | 'md' | 'lg';
  ring?: string;
}) {
  return (
    <div className={cn('relative shrink-0', className)}>
      {children}
      <OnlineIndicator online={online} size={indicatorSize} ring={ring} />
    </div>
  );
}
