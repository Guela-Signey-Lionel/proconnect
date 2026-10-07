'use client';

import { useState, useMemo, useEffect } from 'react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useMessagingStore } from '@/store';
import { profilesApi } from '@/lib/api-services';
import { splitName } from '@/lib/api-mappers';
import type { ProfileSummary, User } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Users, X, Loader2 } from 'lucide-react';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const createGroup = useMessagingStore((s) => s.createGroup);

  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    profilesApi
      .search('', 0, 50)
      .then((page) => {
        setUsers(
          page.results
            .filter((p: ProfileSummary) => p.userId !== currentUser?.id)
            .map((p: ProfileSummary) => {
              const { firstName, lastName } = splitName(p.fullName);
              return {
                id: p.userId,
                firstName,
                lastName,
                email: p.email,
                headline: p.jobTitle ?? undefined,
              } as User;
            })
        );
      })
      .catch(() => setUsers([]))
      .finally(() => setIsLoading(false));
  }, [open, currentUser?.id]);

  const availableUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.headline ?? '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedUsers = users.filter((u) => selectedIds.has(u.id));

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.size === 0) return;
    setIsCreating(true);
    try {
      await createGroup(groupName.trim(), Array.from(selectedIds));
      setGroupName('');
      setSelectedIds(new Set());
      setSearchQuery('');
      onOpenChange(false);
    } catch {
      /* silencieux */
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Créer un groupe</DialogTitle>
          <DialogDescription>
            Créez un espace de discussion pour votre équipe ou département.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-1 overflow-y-auto flex-1 -mx-6 px-6">
          {/* Group name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">Nom du groupe *</Label>
            <Input
              id="group-name"
              placeholder="Ex: Équipe Projet Alpha, Comité RH..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Selected members preview */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>
                {selectedUsers.length} membre{selectedUsers.length > 1 ? 's' : ''} sélectionné
                {selectedUsers.length > 1 ? 's' : ''}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <Badge
                    key={u.id}
                    variant="secondary"
                    className="pl-1.5 pr-1 py-1 bg-sky-50 text-sky-700 gap-1"
                  >
                    <span className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-sky-200 text-sky-800 text-[8px] font-bold">
                          {getInitials(u.firstName, u.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      {u.firstName} {u.lastName.charAt(0)}.
                    </span>
                    <button
                      onClick={() => toggleUser(u.id)}
                      className="ml-0.5 hover:bg-sky-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Member selection */}
          <div className="flex flex-col gap-1.5">
            <Label>Ajouter des membres</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un collaborateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 rounded-lg text-sm"
              />
            </div>
            <ScrollArea className="max-h-48">
              <div className="flex flex-col gap-0.5">
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                  </div>
                ) : (
                  availableUsers.map((user) => {
                    const isChecked = selectedIds.has(user.id);
                    return (
                      <label
                        key={user.id}
                        className={cn(
                          'flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                          isChecked ? 'bg-sky-50' : 'hover:bg-gray-50'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleUser(user.id)}
                          className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-medium">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.headline ?? user.email}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
                {!isLoading && availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun collaborateur trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedIds.size === 0 || isCreating}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Créer le groupe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
