/**
 * Services API ProConnect — un wrapper par endpoint du backend Spring Boot.
 * Toutes les routes sont relatives à API_BASE_URL (http://localhost:8080).
 */

import { api } from '@/lib/api';
import type {
  PageResponse, UserResponse, TokenResponse, ProfileSummary, ProfileDetail,
  Post, Comment, Connection, Conversation, Message, Job, Notification, Skill,
  Experience, Education, Certification, PostAttachment,
  AdminStats, AdminUserDetail, ModerationPost, ModerationComment, AdminActionEntry,
} from '@/types';
import {
  mapPost, mapComment, mapProfileSummary, mapProfileDetail,
  mapConversation, mapMessage, mapNotification,
} from '@/lib/api-mappers';

/* ------------------------------- Auth ------------------------------------ */

export const authApi = {
  register: (body: { email: string; firstName: string; lastName: string; password: string; phone?: string }) =>
    api.post<UserResponse>('/api/v1/auth/register/', body),
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/api/v1/auth/login/', { email, password }),
  refresh: (refreshToken: string) =>
    api.post<TokenResponse>('/api/v1/auth/login/refresh/', { refreshToken }),
  me: () => api.get<UserResponse>('/api/v1/auth/me/'),
  updateAccount: (body: { email?: string; phone?: string }) =>
    api.patch<UserResponse>('/api/v1/auth/me/', body),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<void>('/api/v1/auth/change-password/', { oldPassword, newPassword }),
  requestPasswordReset: (email: string) =>
    api.post<void>('/api/v1/auth/password-reset/', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post<void>('/api/v1/auth/password-reset-confirm/', { token, newPassword }),
  deactivate: () => api.post<void>('/api/v1/auth/deactivate/'),
  googleClientId: () => api.get<{ clientId: string }>('/api/v1/auth/google/client-id/'),
  googleLogin: (idToken: string) =>
    api.post<TokenResponse>('/api/v1/auth/google/login/', { idToken }),
};

/* ------------------------------ Profils ---------------------------------- */

export const profilesApi = {
  /** Répertoire complet : tous les profils actifs (sans pagination). */
  directory: () =>
    api.get<any[]>('/api/v1/profiles/directory/').then((r) => r.map(mapProfileSummary)),
  search: (search?: string, page = 0, size = 20) =>
    api
      .get<PageResponse<any>>(
        `/api/v1/profiles/?page=${page}&size=${size}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      )
      .then((r) => ({ ...r, results: r.results.map(mapProfileSummary) })),
  me: () => api.get<any>('/api/v1/profiles/me/').then(mapProfileDetail),
  detail: (id: string) => api.get<any>(`/api/v1/profiles/${id}/`).then(mapProfileDetail),
  update: (id: string, body: Partial<{ jobTitle: string; department: string; bio: string; location: string; phone: string }>) =>
    api.patch<any>(`/api/v1/profiles/${id}/`, body).then(mapProfileDetail),
  uploadAvatar: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<any>(`/api/v1/profiles/${id}/avatar/`, fd).then(mapProfileDetail);
  },
  uploadMyAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<any>('/api/v1/profiles/me/avatar/', fd).then(mapProfileDetail);
  },
  uploadCover: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<any>(`/api/v1/profiles/${id}/cover/`, fd).then(mapProfileDetail);
  },
  uploadMyCover: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<any>('/api/v1/profiles/me/cover/', fd).then(mapProfileDetail);
  },
  listSkills: () => api.get<Skill[]>('/api/v1/profiles/skills/'),
  addSkill: (name: string) => api.post<Skill>('/api/v1/profiles/skills/', { name }),
  removeSkill: (id: string) => api.delete<void>(`/api/v1/profiles/skills/${id}/`),
  listExperiences: () => api.get<Experience[]>('/api/v1/profiles/experiences/'),
  addExperience: (body: Omit<Experience, 'id'>) => api.post<Experience>('/api/v1/profiles/experiences/', body),
  removeExperience: (id: string) => api.delete<void>(`/api/v1/profiles/experiences/${id}/`),
  listEducation: () => api.get<Education[]>('/api/v1/profiles/education/'),
  addEducation: (body: Omit<Education, 'id'>) => api.post<Education>('/api/v1/profiles/education/', body),
  removeEducation: (id: string) => api.delete<void>(`/api/v1/profiles/education/${id}/`),
  listCertifications: () => api.get<Certification[]>('/api/v1/profiles/certifications/'),
  addCertification: (body: Omit<Certification, 'id'>) =>
    api.post<Certification>('/api/v1/profiles/certifications/', body),
  removeCertification: (id: string) => api.delete<void>(`/api/v1/profiles/certifications/${id}/`),
};

/* -------------------------------- Feed ----------------------------------- */

export const feedApi = {
  list: (page = 0, size = 20) =>
    api
      .get<PageResponse<any>>(`/api/v1/feed/posts/?page=${page}&size=${size}`)
      .then((r) => ({ ...r, results: r.results.map(mapPost) })),
  byAuthor: (authorId: string, page = 0, size = 20) =>
    api
      .get<PageResponse<any>>(`/api/v1/feed/posts/?author=${authorId}&page=${page}&size=${size}`)
      .then((r) => ({ ...r, results: r.results.map(mapPost) })),
  create: (content: string) =>
    api.post<any>('/api/v1/feed/posts/', { content, postType: 'TEXT', visibility: 'EVERYONE' }).then(mapPost),
  /** Crée la publication puis y joint chaque fichier (image/vidéo/document). */
  createWithMedia: async (content: string, files: File[]) => {
    let post = await feedApi.create(content);
    for (const file of files) {
      const att = await feedApi.addAttachment(post.id, file);
      post = { ...post, attachments: [...post.attachments, att] };
    }
    return post;
  },
  /** Modifie le texte et/ou retire des pièces jointes d'une publication publiée. */
  update: (id: string, body: { content?: string; removeAttachmentIds?: string[] }) =>
    api.patch<any>(`/api/v1/feed/posts/${id}/`, body).then(mapPost),
  /** Joindre un fichier à une publication déjà créée. */
  addAttachment: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const type = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT';
    fd.append('attachment_type', type);
    return api.upload<PostAttachment>(`/api/v1/feed/posts/${id}/attachments/`, fd);
  },
  delete: (id: string) => api.delete<void>(`/api/v1/feed/posts/${id}/`),
  like: (id: string) =>
    api.post<{ liked: boolean; likesCount: number }>(`/api/v1/feed/posts/${id}/like/`),
  unlike: (id: string) =>
    api.post<{ liked: boolean; likesCount: number }>(`/api/v1/feed/posts/${id}/unlike/`),
  bookmark: (id: string) => api.post<void>(`/api/v1/feed/posts/${id}/bookmark/`),
  unbookmark: (id: string) => api.delete<void>(`/api/v1/feed/posts/${id}/bookmark/`),
  listBookmarks: (page = 0, size = 20) =>
    api
      .get<PageResponse<any>>(`/api/v1/feed/bookmarks/?page=${page}&size=${size}`)
      .then((r) => ({ ...r, results: r.results.map(mapPost) })),
  listComments: (postId: string, page = 0, size = 50) =>
    api
      .get<PageResponse<any>>(`/api/v1/feed/posts/${postId}/comments/?page=${page}&size=${size}`)
      .then((r) => ({ ...r, results: r.results.map(mapComment) })),
  addComment: (postId: string, content: string) =>
    api.post<any>(`/api/v1/feed/posts/${postId}/comments/`, { content }).then(mapComment),
  deleteComment: (id: string) => api.delete<void>(`/api/v1/feed/comments/${id}/`),
};

/* ------------------------------ Présence --------------------------------- */

export const presenceApi = {
  /** Enregistre le heartbeat de l'utilisateur connecté (appelé toutes les 60 s). */
  heartbeat: () => api.post<{ online: boolean }>('/api/v1/presence/heartbeat/'),
  /** Statut en ligne par lot — renvoie une map { userId: online }. */
  statuses: (userIds: string[]) =>
    api.get<Record<string, boolean>>(
      `/api/v1/presence/statuses/?userIds=${userIds.join(',')}`
    ),
};

/* ---------------------------- Connexions --------------------------------- */

export const connectionsApi = {
  list: (status?: 'PENDING' | 'ACCEPTED') =>
    api
      .get<Connection[]>(`/api/v1/connections/${status ? `?status=${status}` : ''}`),
  send: (addresseeId: string) =>
    api.post<Connection>('/api/v1/connections/', { addresseeId }),
  accept: (id: string) => api.post<Connection>(`/api/v1/connections/${id}/accept/`),
  reject: (id: string) => api.post<Connection>(`/api/v1/connections/${id}/reject/`),
  cancel: (id: string) => api.post<Connection>(`/api/v1/connections/${id}/cancel/`),
  remove: (id: string) => api.delete<void>(`/api/v1/connections/${id}/`),
  listBlocks: () => api.get<unknown[]>('/api/v1/connections/blocks/'),
  block: (blockedId: string) => api.post<void>('/api/v1/connections/blocks/', { blockedId }),
};

/* ----------------------------- Messagerie -------------------------------- */

export const messagingApi = {
  conversations: () =>
    api.get<any[]>('/api/v1/messages/conversations/').then((r) => r.map(mapConversation)),
  startDirect: (participantId: string) =>
    api.post<any>('/api/v1/messages/conversations/', { participantId }).then(mapConversation),
  createGroup: (name: string, participantIds: string[]) =>
    api
      .post<any>('/api/v1/messages/conversations/', { name, participantIds })
      .then(mapConversation),
  history: (conversationId: string, page = 0, size = 100) =>
    api
      .get<PageResponse<any>>(`/api/v1/messages/conversations/${conversationId}/messages/?page=${page}&size=${size}`)
      .then((r) => ({ ...r, results: r.results.map(mapMessage) })),
  send: (conversationId: string, content: string) =>
    api
      .post<any>(`/api/v1/messages/conversations/${conversationId}/messages/`, { content })
      .then(mapMessage),
  sendWithAttachment: (conversationId: string, file: File, content?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (content && content.trim()) fd.append('content', content.trim());
    return api
      .upload<any>(`/api/v1/messages/conversations/${conversationId}/messages/attachment/`, fd)
      .then(mapMessage);
  },
  markRead: (conversationId: string) =>
    api.post<void>(`/api/v1/messages/conversations/${conversationId}/mark-read/`),
  /** Supprime la conversation de MA liste (les autres participants la conservent). */
  deleteConversation: (conversationId: string) =>
    api.delete<void>(`/api/v1/messages/conversations/${conversationId}/`),
  editMessage: (messageId: string, content: string) =>
    api
      .patch<any>(`/api/v1/messages/messages/${messageId}/`, { content })
      .then(mapMessage),
  deleteMessage: (messageId: string) =>
    api.delete<any>(`/api/v1/messages/messages/${messageId}/`).then(mapMessage),
  transferMessage: (messageId: string, targetConversationId: string) =>
    api
      .post<any>(`/api/v1/messages/messages/${messageId}/transfer/`, { targetConversationId })
      .then(mapMessage),
};

/* --------------------------- Notifications ------------------------------- */

export const notificationsApi = {
  list: (unreadOnly = false, page = 0, size = 30) =>
    api
      .get<PageResponse<any>>(
        `/api/v1/notifications/?page=${page}&size=${size}${unreadOnly ? '&unread=true' : ''}`
      )
      .then((r) => ({ ...r, results: r.results.map(mapNotification) })),
  markRead: (id: string) => api.post<Notification>(`/api/v1/notifications/${id}/read/`),
  markAllRead: () => api.post<{ markedRead: number }>('/api/v1/notifications/mark-all-read/'),
};

/* ------------------------------- Emplois --------------------------------- */

export const jobsApi = {
  list: (page = 0, size = 20) => api.get<PageResponse<Job>>(`/api/v1/jobs/?page=${page}&size=${size}`),
  detail: (id: string) => api.get<Job>(`/api/v1/jobs/${id}/`),
  create: (body: {
    title: string; company: string; location: string; type?: string;
    salary?: string; description: string; requirements?: string[];
    skills?: string[]; category?: string;
  }) => api.post<Job>('/api/v1/jobs/', body),
  apply: (id: string) => api.post<Job>(`/api/v1/jobs/${id}/apply/`),
};

/* ------------------------------ Communauté ------------------------------- */

export const communityApi = {
  groups: (page = 0, size = 20) => api.get<PageResponse<any>>(`/api/v1/groups/?page=${page}&size=${size}`),
  events: (page = 0, size = 20) => api.get<PageResponse<any>>(`/api/v1/events/?page=${page}&size=${size}`),
  stories: () => api.get<PageResponse<any>>('/api/v1/stories/'),
};

/* ------------------------------ Administration --------------------------- */

export interface AdminUserFilters {
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  registeredFrom?: string;
  registeredTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
}

export const adminApi = {
  bootstrap: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post<UserResponse>('/api/v1/admin/bootstrap/', body),
  stats: () => api.get<AdminStats>('/api/v1/admin/stats/'),
  users: (filters: AdminUserFilters = {}, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.status) params.set('status', filters.status);
    if (filters.registeredFrom) params.set('registeredFrom', filters.registeredFrom);
    if (filters.registeredTo) params.set('registeredTo', filters.registeredTo);
    if (filters.lastLoginFrom) params.set('lastLoginFrom', filters.lastLoginFrom);
    if (filters.lastLoginTo) params.set('lastLoginTo', filters.lastLoginTo);
    return api.get<PageResponse<UserResponse>>(`/api/v1/admin/users/?${params.toString()}`);
  },
  detail: (id: string) => api.get<AdminUserDetail>(`/api/v1/admin/users/${id}/`),
  warn: (id: string, reason: string, message?: string) =>
    api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/warn/`, { reason, message }),
  suspend: (id: string) => api.post<UserResponse>(`/api/v1/admin/users/${id}/suspend/`),
  reactivate: (id: string) => api.post<UserResponse>(`/api/v1/admin/users/${id}/reactivate/`),
  ban: (id: string) => api.post<UserResponse>(`/api/v1/admin/users/${id}/ban/`),
  /** Ancien toggle conservé pour compatibilité (suspend désormais le compte). */
  setActive: (id: string, active: boolean) =>
    api.patch<UserResponse>(`/api/v1/admin/users/${id}/active/`, { active }),
  setRole: (id: string, role: 'EMPLOYEE' | 'MODERATOR' | 'ADMIN') =>
    api.patch<UserResponse>(`/api/v1/admin/users/${id}/role/`, { role }),
  /**
   * Réinitialise le mot de passe : le serveur génère (ou prend) un mot de passe
   * temporaire, force son changement à la prochaine connexion et le renvoie
   * UNE SEULE FOIS pour être communiqué à l'utilisateur via un canal externe.
   */
  resetPassword: (id: string, newPassword?: string) =>
    api.post<{ temporaryPassword: string }>(
      `/api/v1/admin/users/${id}/reset-password/`,
      newPassword ? { newPassword } : {}
    ),
  /** Suppression LOGIQUE côté backend : statut DELETED + anonymisation. */
  deleteUser: (id: string) => api.delete<void>(`/api/v1/admin/users/${id}/`),

  /* ----------------------------- Modération ------------------------------ */

  moderationPosts: (filters: { hidden?: boolean; search?: string } = {}, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.hidden !== undefined && filters.hidden !== null) params.set('hidden', String(filters.hidden));
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    return api.get<PageResponse<ModerationPost>>(`/api/v1/admin/moderation/posts/?${params.toString()}`);
  },
  moderationComments: (
    filters: { hidden?: boolean; postId?: string; search?: string } = {}, page = 0, size = 20
  ) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.hidden !== undefined && filters.hidden !== null) params.set('hidden', String(filters.hidden));
    if (filters.postId) params.set('postId', filters.postId);
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    return api.get<PageResponse<ModerationComment>>(`/api/v1/admin/moderation/comments/?${params.toString()}`);
  },
  hidePost: (id: string) => api.post<void>(`/api/v1/admin/moderation/posts/${id}/hide/`),
  unhidePost: (id: string) => api.post<void>(`/api/v1/admin/moderation/posts/${id}/unhide/`),
  deleteModerationPost: (id: string) => api.delete<void>(`/api/v1/admin/moderation/posts/${id}/`),
  hideComment: (id: string) => api.post<void>(`/api/v1/admin/moderation/comments/${id}/hide/`),
  unhideComment: (id: string) => api.post<void>(`/api/v1/admin/moderation/comments/${id}/unhide/`),
  deleteModerationComment: (id: string) => api.delete<void>(`/api/v1/admin/moderation/comments/${id}/`),

  /* ------------------------------- Journal ------------------------------- */

  actions: (filters: { actorId?: string; targetUserId?: string; actionType?: string } = {}, page = 0, size = 30) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.actorId) params.set('actorId', filters.actorId);
    if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
    if (filters.actionType) params.set('actionType', filters.actionType);
    return api.get<PageResponse<AdminActionEntry>>(`/api/v1/admin/actions/?${params.toString()}`);
  },
};
