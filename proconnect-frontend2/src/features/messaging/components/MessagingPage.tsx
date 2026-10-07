'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import { useMessagingStore, useAuthStore } from '@/store';
import type { Conversation, User } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  PenSquare,
  UsersRound,
  MessageSquare,
  Users,
  RefreshCw,
} from 'lucide-react';
import { ChatView } from './ChatView';
import { CreateGroupModal } from './CreateGroupModal';
import { PresenceAvatar } from '@/components/ui/online-indicator';
import { useIsOnline } from '@/hooks/use-presence';

/** Avatar avec pastille verte de présence (conversation 1-1). */
function ConversationAvatar({ user }: { user: User }) {
  const isOnline = useIsOnline(user.id);
  return (
    <PresenceAvatar online={isOnline} indicatorSize="md" ring="ring-white">
      <Avatar className="h-[52px] w-[52px]">
        {user.avatar && <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />}
        <AvatarFallback className="bg-sky-100 text-sky-700 text-base font-semibold">
          {getInitials(user.firstName, user.lastName)}
        </AvatarFallback>
      </Avatar>
    </PresenceAvatar>
  );
}

/** Le "autre participant" d'une conversation directe. */
export function otherParticipant(conv: Conversation, currentUserId: string): User | null {
  const other = conv.participants.find((p) => p.id !== currentUserId);
  return other ?? conv.participants[0] ?? null;
}

export function MessagingPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const conversations = useMessagingStore((s) => s.conversations);
  const isLoading = useMessagingStore((s) => s.isLoading);
  const error = useMessagingStore((s) => s.error);
  const activeConversationId = useMessagingStore((s) => s.activeConversationId);
  const chatTab = useMessagingStore((s) => s.chatTab);
  const loadConversations = useMessagingStore((s) => s.loadConversations);
  const openConversation = useMessagingStore((s) => s.openConversation);
  const setActiveConversation = useMessagingStore((s) => s.setActiveConversation);
  const setChatTab = useMessagingStore((s) => s.setChatTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filtered = useMemo(() => {
    let list = [...conversations];
    if (chatTab === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (chatTab === 'groups') list = list.filter((c) => c.isGroup);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const name = c.isGroup
          ? c.name ?? ''
          : otherParticipant(c, currentUser?.id ?? '')?.fullName ??
            `${otherParticipant(c, currentUser?.id ?? '')?.firstName ?? ''} ${otherParticipant(c, currentUser?.id ?? '')?.lastName ?? ''}`;
        return name.toLowerCase().includes(q) || (c.lastMessage?.content ?? '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [conversations, chatTab, searchQuery, currentUser]);

  const handleSelect = (conv: Conversation) => {
    openConversation(conv.id);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setActiveConversation(null);
    setMobileShowChat(false);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full">
      {/* ===== LEFT PANEL ===== */}
      <div
        className={cn(
          'w-full md:w-[360px] lg:w-[400px] bg-white border-r flex flex-col shrink-0',
          mobileShowChat && 'hidden md:flex'
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-foreground">Discussions</h1>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Nouveau groupe"
              title="Créer un groupe"
            >
              <UsersRound className="h-[22px] w-[22px] text-gray-600" />
            </button>
            <button
              onClick={() => loadConversations()}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Actualiser"
              title="Actualiser"
            >
              <RefreshCw className="h-[20px] w-[20px] text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une discussion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-gray-100 border-none rounded-lg text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-sky-300"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 flex gap-1 pb-2 shrink-0">
          {(['all', 'unread', 'groups'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setChatTab(tab)}
              className={cn(
                'px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors',
                chatTab === tab
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {tab === 'all' ? 'Tous' : tab === 'unread' ? 'Non lues' : 'Groupes'}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="px-2">
            {isLoading ? (
              <div className="space-y-2 px-1 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-[52px] w-[52px] rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center px-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Aucune discussion</p>
                <p className="text-xs text-gray-400 mt-1">
                  Créez un groupe ou contactez un collaborateur depuis le réseau
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const isActive = activeConversationId === conv.id;
                if (conv.isGroup) {
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelect(conv)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                        isActive ? 'bg-sky-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="h-[52px] w-[52px] bg-sky-100 rounded-full flex items-center justify-center shrink-0">
                        <Users className="h-6 w-6 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-gray-100 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-semibold text-foreground truncate">
                            {conv.name ?? 'Groupe'}
                          </span>
                          <span className="text-[11px] shrink-0 ml-2 text-gray-400">
                            {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[13px] truncate pr-2 text-gray-500">
                            {conv.lastMessage?.content ?? 'Nouvelle conversation de groupe'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 h-[22px] min-w-[22px] px-1.5 bg-sky-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }
                const other = otherParticipant(conv, currentUser?.id ?? '');
                if (!other) return null;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelect(conv)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                      isActive ? 'bg-sky-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <ConversationAvatar user={other} />
                    <div className="flex-1 min-w-0 border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-[15px] truncate',
                          conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'
                        )}>
                          {other.firstName} {other.lastName}
                        </span>
                        <span className={cn(
                          'text-[11px] shrink-0 ml-2',
                          conv.unreadCount > 0 ? 'text-sky-500 font-semibold' : 'text-gray-400'
                        )}>
                          {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={cn(
                          'text-[13px] truncate pr-2',
                          conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                        )}>
                          {conv.lastMessage?.content ?? 'Nouvelle conversation'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 h-[22px] min-w-[22px] px-1.5 bg-sky-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          !mobileShowChat && 'hidden md:flex'
        )}
      >
        {activeConversation ? (
          <ChatView conversation={activeConversation} onBack={handleBack} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center">
                <MessageSquare className="h-12 w-12 text-sky-200" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-light text-gray-700">ProConnect Messagerie</h2>
                <p className="text-sm text-gray-400 mt-2 max-w-sm">
                  Sélectionnez une discussion pour commencer à communiquer avec vos collaborateurs.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <CreateGroupModal
          open={showGroupModal}
          onOpenChange={setShowGroupModal}
        />
      )}
    </div>
  );
}
