'use client';

import { useState } from 'react';
import { File as FileIcon, Download, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Rendu d'une pièce jointe de message : image, vidéo, audio (vocal) ou fichier.
 * Le type est fourni par le backend (IMAGE / VIDEO / AUDIO / FILE) ; en cas de
 * type manquant on devine à partir de l'extension de l'URL.
 */
export function MessageAttachment({
  message,
  isSent,
  onOpenImage,
}: {
  message: Message;
  isSent: boolean;
  onOpenImage?: (url: string) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const url = message.attachmentUrl;
  if (!url) return null;

  const type = message.attachmentType ?? guessType(url);

  if (type === 'IMAGE') {
    return (
      <button
        type="button"
        onClick={() => onOpenImage?.(url)}
        className="relative rounded-xl overflow-hidden max-w-[260px] block cursor-zoom-in text-left"
        title="Cliquer pour agrandir"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 min-h-[120px]">
            <Loader2 className="h-5 w-5 animate-spin text-white/70" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={message.attachmentName ?? 'Image'}
          onLoad={() => setImageLoaded(true)}
          className={cn('rounded-xl max-h-[280px] w-auto object-cover transition-opacity', imageLoaded ? 'opacity-100' : 'opacity-0')}
        />
      </button>
    );
  }

  if (type === 'VIDEO') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="rounded-xl max-w-[280px] max-h-[280px]"
      />
    );
  }

  if (type === 'AUDIO') {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 min-w-[220px]', isSent ? 'bg-white/15' : 'bg-black/5')}>
        <audio src={url} controls className="h-9 w-full max-w-[230px]" />
      </div>
    );
  }

  // FILE — tout autre format : carte de téléchargement
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={message.attachmentName ?? undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 min-w-[220px] max-w-[280px] transition-colors',
        isSent ? 'bg-white/15 hover:bg-white/25' : 'bg-black/5 hover:bg-black/10'
      )}
    >
      <span className={cn('flex items-center justify-center h-10 w-10 rounded-lg shrink-0', isSent ? 'bg-white/20' : 'bg-white')}>
        <FileIcon className={cn('h-5 w-5', isSent ? 'text-white' : 'text-sky-700')} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn('block text-[13px] font-medium truncate', isSent ? 'text-white' : 'text-foreground')}>
          {message.attachmentName ?? 'Fichier'}
        </span>
        <span className={cn('block text-[11px]', isSent ? 'text-white/70' : 'text-gray-500')}>
          {formatSize(message.attachmentSize)}
        </span>
      </span>
      <Download className={cn('h-4 w-4 shrink-0', isSent ? 'text-white/80' : 'text-gray-400')} />
    </a>
  );
}

function guessType(url: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'IMAGE';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'VIDEO';
  if (['mp3', 'wav', 'ogg', 'webm-audio', 'm4a', 'aac', 'opus'].includes(ext)) return 'AUDIO';
  return 'FILE';
}
