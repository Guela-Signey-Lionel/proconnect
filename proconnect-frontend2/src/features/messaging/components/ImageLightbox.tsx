'use client';

/**
 * Visionneuse d'image plein écran (clic sur une image d'un message pour l'agrandir).
 * Fermeture : clic sur le fond, bouton X ou touche Échap.
 */

import { useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  fileName?: string | null;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, fileName, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Bloque le scroll de la page en arrière-plan.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? 'Image agrandie'}
    >
      {/* Barre d'actions */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          download={fileName ?? undefined}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="Télécharger l'image"
          title="Télécharger"
        >
          <Download className="h-5 w-5" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="Fermer"
          title="Fermer (Échap)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? 'Image'}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
