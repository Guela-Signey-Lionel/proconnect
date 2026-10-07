'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSend: (file: File) => Promise<void>;
  disabled?: boolean;
}

/**
 * Enregistrement de messages vocaux via MediaRecorder :
 * bouton micro → enregistrement (chrono + pulse) → arrêt → aperçu → envoi.
 * Format : audio webm/opus, lu nativement par le <audio> du chat.
 */
export function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'preview' | 'sending'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setPreviewUrl(URL.createObjectURL(blob));
        setState('preview');
        cleanup();
      };
      recorderRef.current = recorder;
      recorder.start();
      setState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // Micro refusé ou indisponible — silencieux mais visible via l'état inchangé.
      alert("Impossible d'accéder au microphone. Vérifiez les autorisations du navigateur.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
  };

  const cancel = () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    setState('idle');
    setSeconds(0);
  };

  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const send = async () => {
    if (!previewUrl || isSendingVoice) return;
    setIsSendingVoice(true);
    setState('sending');
    try {
      const blob = await fetch(previewUrl).then((r) => r.blob());
      const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `vocal-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
      await onSend(file);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSeconds(0);
      setState('idle');
      setIsSendingVoice(false);
    }
  };

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 flex-1">
        <span className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-red-50 border border-red-200 flex-1 max-w-[260px]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
          </span>
          <span className="text-sm font-medium text-red-600 tabular-nums">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </span>
        <Button type="button" size="icon" onClick={cancel} variant="outline" className="h-10 w-10 rounded-full shrink-0" aria-label="Annuler">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
        <Button type="button" size="icon" onClick={stop} className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0" aria-label="Arrêter">
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (state === 'preview') {
    return (
      <div className="flex items-center gap-2 flex-1">
        <audio src={previewUrl ?? undefined} controls className="h-10 flex-1 max-w-[280px]" />
        <Button type="button" size="icon" onClick={cancel} variant="outline" className="h-10 w-10 rounded-full shrink-0" aria-label="Rejeter">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
        <Button type="button" size="icon" onClick={send} disabled={isSendingVoice} className="h-10 w-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white shrink-0" aria-label="Envoyer le vocal">
          {isSendingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      onClick={start}
      disabled={disabled}
      variant="ghost"
      className="h-10 w-10 rounded-full shrink-0 text-gray-500 hover:text-sky-600 hover:bg-sky-50"
      aria-label="Enregistrer un message vocal"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
