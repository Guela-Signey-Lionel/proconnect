'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <div className="absolute bottom-12 right-0 z-50 shadow-xl rounded-xl overflow-hidden">
          <EmojiPicker
            onEmojiClick={(data) => {
              onSelect(data.emoji);
            }}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.LIGHT}
            searchPlaceholder="Rechercher un emoji…"
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
            width={340}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
