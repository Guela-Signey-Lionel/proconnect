/**
 * Mappers : DTO du backend Spring → types du frontend.
 */

import type {
  User,
  Post,
  Comment,
  ProfileSummary,
  ProfileDetail,
  Conversation,
  Message,
  Notification,
  NotificationType,
  Author,
} from '@/types';

/* --------------------------- Utilitaires --------------------------------- */

export function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? '').trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return { firstName: '?', lastName: '?' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function nameParts(fullName: string | null | undefined): { firstName: string; lastName: string } {
  return splitName(fullName);
}

/** "John Doe" → "John" / "Doe" (complète les champs manquants). */
export function authorToUser(author: Author | null | undefined): User {
  const { firstName, lastName } = splitName(author?.fullName);
  return {
    id: author?.id ?? '?',
    firstName,
    lastName,
    email: author?.email ?? '',
    fullName: author?.fullName ?? undefined,
  };
}

export function initialsOf(u: { firstName?: string; lastName?: string; fullName?: string }): string {
  const first = u.firstName ?? splitName(u.fullName).firstName;
  const last = u.lastName ?? splitName(u.fullName).lastName;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Timezone-safe : le backend renvoie des instants ISO sans suffixe Z. */
export function isoDate(s: string | null | undefined): string {
  if (!s) return new Date().toISOString();
  return /[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
}

/* ------------------------- Profil / Utilisateur --------------------------- */

export function mapProfileSummary(p: any): ProfileSummary {
  return {
    id: p.id,
    userId: p.userId,
    fullName: p.fullName,
    email: p.email,
    avatarUrl: p.avatarUrl ?? null,
    jobTitle: p.jobTitle ?? null,
    department: p.department ?? null,
    online: p.online ?? false,
  };
}

export function summaryToUser(p: ProfileSummary): User {
  const { firstName, lastName } = splitName(p.fullName);
  return {
    id: p.userId,
    firstName,
    lastName,
    email: p.email,
    fullName: p.fullName,
    avatar: p.avatarUrl,
    jobTitle: p.jobTitle,
    department: p.department,
    headline: p.jobTitle ?? undefined,
    company: p.department ?? undefined,
  };
}

export function mapProfileDetail(p: any): ProfileDetail {
  return {
    id: p.id,
    userId: p.userId,
    fullName: p.fullName,
    email: p.email,
    avatarUrl: p.avatarUrl ?? null,
    jobTitle: p.jobTitle ?? null,
    department: p.department ?? null,
    bio: p.bio ?? null,
    location: p.location ?? null,
    phone: p.phone ?? null,
    coverUrl: p.coverUrl ?? null,
    online: p.online ?? false,
    skills: (p.skills ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    experiences: (p.experiences ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      startDate: e.startDate,
      endDate: e.endDate ?? null,
      description: e.description ?? null,
    })),
    education: (p.education ?? []).map((e: any) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      startDate: e.startDate,
      endDate: e.endDate ?? null,
    })),
    certifications: (p.certifications ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issuedDate: c.issuedDate,
      expiryDate: c.expiryDate ?? null,
    })),
  };
}

/* ------------------------------- Feed ------------------------------------ */

export function mapPost(p: any): Post {
  return {
    id: p.id,
    author: p.author,
    content: p.content ?? '',
    postType: p.postType ?? 'TEXT',
    visibility: p.visibility ?? 'EVERYONE',
    attachments: (p.attachments ?? []).map((a: any) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      attachmentType: a.attachmentType,
      sizeBytes: a.sizeBytes ?? 0,
    })),
    likesCount: p.likesCount ?? 0,
    commentsCount: p.commentsCount ?? 0,
    likedByMe: p.likedByMe ?? false,
    createdAt: isoDate(p.createdAt),
    updatedAt: isoDate(p.updatedAt),
  };
}

export function mapComment(c: any): Comment {
  return {
    id: c.id,
    postId: c.postId,
    author: c.author,
    parentId: c.parentId ?? null,
    content: c.content ?? null,
    sticker: c.sticker ?? null,
    repliesCount: c.repliesCount ?? 0,
    createdAt: isoDate(c.createdAt),
  };
}

/* ----------------------------- Messagerie -------------------------------- */

export function mapParticipant(u: any): User {
  const { firstName, lastName } = splitName(u.fullName ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`);
  return {
    id: u.id,
    firstName: u.firstName ?? firstName,
    lastName: u.lastName ?? lastName,
    email: u.email,
    fullName: u.fullName,
    avatar: u.avatarUrl ?? null,
    phone: u.phone ?? null,
    online: u.online ?? false,
  };
}

export function mapMessage(m: any): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    sender: mapParticipant(m.sender),
    content: m.content ?? null,
    attachmentUrl: m.attachmentUrl ?? null,
    attachmentType: m.attachmentType ?? null,
    attachmentName: m.attachmentName ?? null,
    attachmentSize: m.attachmentSize ?? null,
    isEdited: m.isEdited ?? false,
    editedAt: m.editedAt ? isoDate(m.editedAt) : null,
    isDeleted: m.isDeleted ?? false,
    createdAt: isoDate(m.createdAt),
  };
}

export function mapConversation(c: any): Conversation {
  return {
    id: c.id,
    isGroup: c.isGroup,
    name: c.name ?? null,
    participants: (c.participants ?? []).map(mapParticipant),
    lastMessage: c.lastMessage ? mapMessage(c.lastMessage) : null,
    unreadCount: c.unreadCount ?? 0,
    createdAt: isoDate(c.createdAt),
  };
}

/* --------------------------- Notifications ------------------------------- */

export function mapNotification(n: any): Notification {
  const type = String(n.notificationType ?? 'SYSTEM');
  const known: NotificationType[] = [
    'LIKE', 'COMMENT', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED',
    'NEW_MESSAGE', 'JOB_APPLICATION', 'GROUP_ADDED', 'SYSTEM',
  ];
  return {
    id: n.id,
    notificationType: (known.includes(type as NotificationType) ? type : 'SYSTEM') as NotificationType,
    objectId: n.objectId ?? null,
    message: n.message ?? '',
    isRead: n.isRead ?? false,
    actorId: n.actorId ?? null,
    actorName: n.actorName ?? null,
    createdAt: isoDate(n.createdAt),
  };
}

/** Libellé FR d'un type de notification. */
export function notificationLabel(type: Notification['notificationType']): string {
  switch (type) {
    case 'LIKE': return 'J’aime';
    case 'COMMENT': return 'Commentaire';
    case 'CONNECTION_REQUEST': return 'Invitation';
    case 'CONNECTION_ACCEPTED': return 'Invitation acceptée';
    case 'NEW_MESSAGE': return 'Message';
    case 'JOB_APPLICATION': return 'Candidature';
    case 'GROUP_ADDED': return 'Groupe';
    default: return 'Notification';
  }
}
