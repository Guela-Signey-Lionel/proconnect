'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import { useNotificationStore, usePreferencesStore } from '@/store';
import { playSound } from '@/lib/sounds';
import { splitName } from '@/lib/api-mappers';
import {
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  Briefcase,
  Award,
  Bell,
  CheckCheck,
  Clock,
  Users,
} from 'lucide-react';
import type { Notification } from '@/types';

type FilterTab = 'all' | 'unread' | 'messages' | 'connections' | 'jobs';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'unread', label: 'Non lues' },
  { key: 'messages', label: 'Messages' },
  { key: 'connections', label: 'Connexions' },
  { key: 'jobs', label: 'Emplois' },
];

function getNotificationIcon(type: Notification['notificationType']) {
  switch (type) {
    case 'LIKE':
      return <Heart className="h-4 w-4 text-rose-500" />;
    case 'COMMENT':
      return <MessageSquare className="h-4 w-4 text-sky-500" />;
    case 'CONNECTION_REQUEST':
    case 'CONNECTION_ACCEPTED':
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case 'JOB_APPLICATION':
      return <Briefcase className="h-4 w-4 text-violet-500" />;
    case 'GROUP_ADDED':
      return <Users className="h-4 w-4 text-teal-500" />;
    case 'NEW_MESSAGE':
      return <MessageSquare className="h-4 w-4 text-sky-500" />;
    case 'SYSTEM':
      return <Award className="h-4 w-4 text-orange-500" />;
    default:
      return <AtSign className="h-4 w-4 text-amber-500" />;
  }
}

export function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const error = useNotificationStore((s) => s.error);
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const soundPreset = usePreferencesStore((s) => s.soundPreset);
  const soundVolume = usePreferencesStore((s) => s.soundVolume);
  const soundForNotification = usePreferencesStore((s) => s.soundForNotification);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [soundPlayed, setSoundPlayed] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Son de notification une seule fois au premier chargement avec données.
  useEffect(() => {
    if (!isLoading && notifications.length > 0 && !soundPlayed) {
      setSoundPlayed(true);
      if (soundEnabled && soundForNotification) {
        playSound('notification', soundPreset, soundVolume);
      }
    }
  }, [isLoading, notifications.length, soundPlayed, soundEnabled, soundForNotification, soundPreset, soundVolume]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((n) => !n.isRead);
      case 'messages':
        return notifications.filter((n) => n.notificationType === 'NEW_MESSAGE');
      case 'connections':
        return notifications.filter((n) =>
          ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED'].includes(n.notificationType)
        );
      case 'jobs':
        return notifications.filter((n) => n.notificationType === 'JOB_APPLICATION');
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Marquer tout comme lu
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {filterTabs.map((tab) => {
          const count =
            tab.key === 'all'
              ? notifications.length
              : tab.key === 'unread'
                ? unreadCount
                : notifications.filter((n) => {
                    if (tab.key === 'messages') return n.notificationType === 'NEW_MESSAGE';
                    if (tab.key === 'connections')
                      return ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED'].includes(n.notificationType);
                    if (tab.key === 'jobs') return n.notificationType === 'JOB_APPLICATION';
                    return false;
                  }).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                activeTab === tab.key
                  ? 'bg-background text-sky-600 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5',
                    activeTab === tab.key
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-16 shrink-0" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => loadNotifications()}>
                Réessayer
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                <Bell className="h-7 w-7 text-sky-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {activeTab === 'unread'
                  ? 'Aucune notification non lue'
                  : 'Aucune notification'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === 'unread'
                  ? 'Toutes vos notifications sont à jour'
                  : 'Vous recevrez des notifications ici'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)] min-h-[300px] w-full">
              <div className="divide-y">
                {filteredNotifications.map((notification) => {
                  const { firstName, lastName } = splitName(notification.actorName);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
                        !notification.isRead && 'bg-sky-50/40'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-xs">
                            {getInitials(firstName || '?', lastName || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center border border-background">
                          {getNotificationIcon(notification.notificationType)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          {notification.actorName && (
                            <span className="font-semibold text-foreground">
                              {notification.actorName}{' '}
                            </span>
                          )}
                          <span className="text-muted-foreground">{notification.message}</span>
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {!notification.isRead && (
                        <div className="shrink-0 mt-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
