'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn, getInitials } from '@/lib/utils';
import { useMessagingStore, useAuthStore } from '@/store';
import type { Conversation, Message } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, Paperclip, X, Ban } from 'lucide-react';
import { otherParticipant } from './MessagingPage';
import { MessageAttachment } from './MessageAttachment';
import { EmojiPickerButton } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { MessageActions } from './MessageActions';
import { ImageLightbox } from './ImageLightbox';
import { ConversationInfoMenu, chatThemeClasses } from './ConversationInfoMenu';
import { OnlineIndicator } from '@/components/ui/online-indicator';
import { useIsOnline } from '@/hooks/use-presence';

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

/** Référence stable : évite qu'un `?? []` recrée un tableau à chaque snapshot (boucle infinie React). */
const EMPTY_MESSAGES: Message[] = [];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const messages = useMessagingStore((s) =>
    conversation.id ? (s.messages[conversation.id] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES
  );
  const isLoadingMessages = useMessagingStore((s) => s.isLoadingMessages);
  const sendMessage = useMessagingStore((s) => s.sendMessage);
  const sendAttachment = useMessagingStore((s) => s.sendAttachment);
  const subscribeRealtime = useMessagingStore((s) => s.subscribeRealtime);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // Thème de la discussion (personnalisable via le menu burger).
  const [theme, setTheme] = useState({ sent: 'bg-sky-500', sentHover: 'hover:bg-sky-600' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGroup = conversation.isGroup;
  const other = otherParticipant(conversation, currentUser?.id ?? '');
  // Statut en ligne de l'interlocuteur (conversations directes uniquement).
  const otherOnline = useIsOnline(!isGroup ? other?.id : null);
  const displayName = isGroup
    ? conversation.name ?? 'Groupe'
    : other
      ? `${other.firstName} ${other.lastName}`
      : 'Conversation';

  // Temps réel : abonnement aux nouveaux messages de cette conversation.
  useEffect(() => {
    if (!conversation.id) return;
    return subscribeRealtime(conversation.id);
  }, [conversation.id, subscribeRealtime]);

  // Applique le thème (couleur des bulles) choisi pour cette conversation.
  useEffect(() => {
    setTheme(chatThemeClasses(conversation.id));
  }, [conversation.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages.length, isLoadingMessages]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (isSending || uploadProgress) return;
    if (pendingFile) {
      // Fichier en attente (choisi via le trombone) → envoi avec légende optionnelle
      setIsSending(true);
      try {
        await sendAttachment(conversation.id, pendingFile, content);
        setPendingFile(null);
        setText('');
      } catch {
        /* silencieux */
      } finally {
        setIsSending(false);
      }
      return;
    }
    if (!content) return;
    setIsSending(true);
    try {
      await sendMessage(conversation.id, content);
      setText('');
    } catch {
      /* silencieux */
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, uploadProgress, pendingFile, conversation.id, sendMessage, sendAttachment]);

  const handleSendVoice = useCallback(async (file: File) => {
    await sendAttachment(conversation.id, file);
  }, [conversation.id, sendAttachment]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* ===== Header bar ===== */}
      <div className="bg-white border-b flex items-center px-4 py-2.5 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        {isGroup ? (
          <div className="relative h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-sky-700">
              {getInitials((conversation.name ?? 'G')[0], '')}
            </span>
          </div>
        ) : other ? (
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {other.avatar && <AvatarImage src={other.avatar} alt={`${other.firstName} ${other.lastName}`} />}
              <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-medium">
                {getInitials(other.firstName, other.lastName)}
              </AvatarFallback>
            </Avatar>
            <OnlineIndicator online={otherOnline} size="sm" ring="ring-white" />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{displayName}</h2>
          {isGroup ? (
            <p className="text-xs text-gray-500">{conversation.participants.length} membres</p>
          ) : otherOnline ? (
            <p className="text-xs text-emerald-600 font-medium">En ligne</p>
          ) : (
            <p className="text-xs text-gray-400 truncate">{other?.email}</p>
          )}
        </div>

        {/* Menu burger : infos, membres, médias, liens, documents, thème, bloquer, supprimer */}
        <ConversationInfoMenu conversation={conversation} />
      </div>

      {/* ===== Messages area ===== */}
      <ScrollArea ref={scrollRef} className="flex-1 bg-[#f0f2f5]">
        <div className="flex flex-col gap-1 px-4 py-3">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">Aucun message dans cette conversation.</p>
              <p className="text-xs text-gray-400 mt-1">Envoyez le premier message !</p>
            </div>
          ) : (
            messages.map((msg: Message, idx: number) => {
              const isSent = msg.sender.id === currentUser?.id;
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showDateSep =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(msg.createdAt).toDateString();
              const hasAttachment = !!msg.attachmentUrl;
              const isDeletedMsg = !!msg.isDeleted;
              const canEdit = isSent && !isDeletedMsg && !hasAttachment && !!msg.content;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex justify-center mb-3 mt-1">
                      <span className="text-[11px] text-gray-500 bg-white rounded-lg px-3 py-1 shadow-sm">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={cn('group/msg flex items-center gap-1', isSent ? 'justify-end' : 'justify-start')}>
                    {/* Menu 3 points — à gauche pour les messages envoyés */}
                    {isSent && (
                      <MessageActions
                        message={msg}
                        conversation={conversation}
                        isSent={isSent}
                        hasAttachment={hasAttachment}
                        canEdit={canEdit}
                      />
                    )}
                    <div className={cn('flex flex-col max-w-[75%]', isSent ? 'items-end' : 'items-start')}>
                      {isGroup && !isSent && (
                        <p className="text-[11px] font-semibold text-sky-600 ml-1 mb-0.5">
                          {msg.sender.firstName} {msg.sender.lastName}
                        </p>
                      )}
                      <div
                        className={cn(
                          'px-2 py-1.5 text-sm leading-relaxed shadow-sm break-words max-w-full',
                          isSent
                            ? `${theme.sent} text-white rounded-tl-xl rounded-bl-xl rounded-br-xl`
                            : 'bg-white text-foreground rounded-tr-xl rounded-tl-xl rounded-br-xl',
                          isDeletedMsg && 'italic opacity-70'
                        )}
                      >
                        {isDeletedMsg ? (
                          <div className="px-1 text-[13px] text-gray-500 flex items-center gap-1.5">
                            <Ban className="h-3.5 w-3.5" />
                            Message supprimé
                          </div>
                        ) : (
                          <>
                            {hasAttachment && (
                              <div className="mb-1">
                                <MessageAttachment
                                  message={msg}
                                  isSent={isSent}
                                  onOpenImage={setLightboxUrl}
                                />
                              </div>
                            )}
                            {msg.content && <div className="px-1 whitespace-pre-wrap">{msg.content}</div>}
                          </>
                        )}
                        {msg.isEdited && !isDeletedMsg && (
                          <span className="block text-right text-[10px] opacity-60 mt-0.5 px-1">modifié</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    {/* Menu 3 points — à droite pour les messages reçus */}
                    {!isSent && (
                      <MessageActions
                        message={msg}
                        conversation={conversation}
                        isSent={isSent}
                        hasAttachment={hasAttachment}
                        canEdit={canEdit}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ===== Visionneuse d'image ===== */}
      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      {/* ===== Aperçu du fichier en attente ===== */}
      {pendingFile && (
        <div className="bg-white border-t px-3 py-2 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
            <Paperclip className="h-4 w-4 text-sky-600 shrink-0" />
            <span className="text-[13px] text-foreground truncate flex-1">{pendingFile.name}</span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {(pendingFile.size / (1024 * 1024)).toFixed(1)} Mo
            </span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
              aria-label="Retirer le fichier"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Input ===== */}
      <div className="bg-white border-t px-3 py-2 flex items-center gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
          accept="*/*"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onPickFile}
          disabled={isSending}
          className="h-10 w-10 rounded-full shrink-0 text-gray-500 hover:text-sky-600 hover:bg-sky-50"
          aria-label="Joindre un fichier (image, vidéo, document…)"
          title="Joindre un fichier (image, vidéo, document…)"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <EmojiPickerButton
          onSelect={(emoji) => setText((t) => t + emoji)}
          disabled={isSending}
        />

        <Input
          placeholder="Écrire un message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 h-10 rounded-full bg-[#f0f2f5] border-none text-sm focus-visible:ring-1 focus-visible:ring-sky-300"
        />

        {text.trim() || pendingFile ? (
          <Button
            onClick={handleSend}
            disabled={isSending || uploadProgress}
            size="icon"
            className={`h-10 w-10 rounded-full ${theme.sent} ${theme.sentHover} text-white shrink-0`}
            aria-label="Envoyer"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        ) : (
          <VoiceRecorder onSend={handleSendVoice} disabled={isSending} />
        )}
      </div>
    </div>
  );
}
