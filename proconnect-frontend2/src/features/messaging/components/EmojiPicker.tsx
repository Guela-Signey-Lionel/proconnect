'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmojiPickerButtonProps {
  /** Appelé avec l'emoji choisi (ex: "😀") à insérer dans le texte. */
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

/** Bouton smiley + panneau de sélection d'emojis (fermeture au clic extérieur). */
export function EmojiPickerButton({ onSelect, disabled }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="h-10 w-10 rounded-full text-gray-500 hover:text-amber-500 hover:bg-amber-50"
        aria-label="Emojis"
      >
        <Smile className="h-5 w-5" />
      </Button>
      {open && (
        <div
          className={cn(
            // Petits écrans : panneau ancré au bas de l'écran, largeur = écran
            // moins marges — plus aucune colonne/emoji coupée. ≥ sm : ancré au
            //-dessus du bouton, largeur fixe.
            'fixed inset-x-2 bottom-16 z-50 shadow-xl rounded-xl overflow-hidden',
            'sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-12 sm:w-[340px]'
          )}
        >
          <EmojiPicker
            onEmojiClick={(data) => {
              onSelect(data.emoji);
            }}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.LIGHT}
            searchPlaceholder="Rechercher un emoji…"
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
            width="100%"
            height={typeof window !== 'undefined' ? Math.min(400, window.innerHeight - 180) : 400}
          />
        </div>
      )}
    </div>
  );
}
