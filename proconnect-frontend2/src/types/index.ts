export type PageView =
  | 'feed'
  | 'network'
  | 'jobs'
  | 'messaging'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'search'
  | 'admin';

/** Enveloppe de pagination standard du backend (common/PageResponse). */
export interface PageResponse<T> {
  results: T[];
  count: number;
  numPages: number;
  currentPage: number;
}

/** Auteur d'un post/commentaire (feed/dto/AuthorResponse). */
export interface Author {
  id: string;
  fullName: string;
  email: string;
  /** Utilisateur actuellement en ligne (heartbeat de moins de 2 min). */
  online?: boolean;
}

/** Résumé de profil renvoyé par /api/v1/profiles (ProfileSummaryResponse). */
export interface ProfileSummary {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  /** Utilisateur actuellement en ligne (heartbeat de moins de 2 min). */
  online?: boolean;
}

/** Profil complet renvoyé par /api/v1/profiles/{id} (ProfileResponse). */
export interface ProfileDetail {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  coverUrl: string | null;
  /** Utilisateur actuellement en ligne (heartbeat de moins de 2 min). */
  online?: boolean;
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  certifications: Certification[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate: string | null;
}

/** Utilisateur " léger " renvoyé par les listes et participants. */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName?: string;
  avatar?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  headline?: string;
  location?: string;
  bio?: string;
  company?: string;
  role?: 'EMPLOYEE' | 'MODERATOR' | 'ADMIN';
  active?: boolean;
  /** Le serveur exige un changement de mot de passe à cette session. */
  mustChangePassword?: boolean;
  /** Droits d'administration complets (gestion des comptes + modération). */
  isAdmin?: boolean;
  /** MODERATOR : accès limité au panneau de modération. */
  isModerator?: boolean;
  /** Utilisateur actuellement en ligne (heartbeat de moins de 2 min). */
  online?: boolean;
}

export interface PostAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  attachmentType: 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  sizeBytes: number;
}

export interface Post {
  id: string;
  author: Author;
  content: string | null;
  postType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'MIXED';
  visibility: 'EVERYONE' | 'CONNECTIONS' | 'PRIVATE';
  attachments: PostAttachment[];
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  parentId: string | null;
  content: string | null;
  sticker: string | null;
  repliesCount: number;
  createdAt: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string | null;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Connection {
  id: string;
  requester: User;
  addressee: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  respondedAt: string | null;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
}

/** Récapitulatif des médias/liens/documents d'une conversation (calculé côté client). */
export interface ConversationMediaSummary {
  images: Message[];
  videos: Message[];
  audios: Message[];
  documents: Message[];
  links: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  content: string | null;
  attachmentUrl: string | null;
  attachmentType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  type: string | null;
  salary: string | null;
  description: string | null;
  requirements: string[];
  skills: string[];
  category: string | null;
  applicants: number;
  isApplied: boolean;
  isSaved: boolean;
  postedAt: string;
}

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'NEW_MESSAGE'
  | 'JOB_APPLICATION'
  | 'GROUP_ADDED'
  | 'SYSTEM';

export interface Notification {
  id: string;
  notificationType: NotificationType;
  objectId: string | null;
  message: string;
  isRead: boolean;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface SearchResult {
  type: 'users';
  item: ProfileSummary;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Vrai si le serveur exige un changement de mot de passe (bootstrap admin). */
  mustChangePassword?: boolean;
}

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'EMPLOYEE' | 'MODERATOR' | 'ADMIN';
  active: boolean;
  status?: UserAccountStatus;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  avatarUrl?: string | null;
}

/* --------------------------- Administration ------------------------------ */

export type AdminRole = 'EMPLOYEE' | 'MODERATOR' | 'ADMIN';

export interface AdminWarning {
  id: string;
  reason: string;
  message: string | null;
  issuedById: string | null;
  issuedByName: string | null;
  createdAt: string;
}

/** Détail d'un compte côté administration (profil, activité, avertissements). */
export interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: AdminRole;
  status: UserAccountStatus;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  phone: string | null;
  bio: string | null;
  postsCount: number;
  commentsCount: number;
  messagesCount: number;
  warnings: AdminWarning[];
}

export interface AdminStats {
  totalUsers: number;
  newToday: number;
  newLast7Days: number;
  newLast30Days: number;
  suspendedAccounts: number;
  bannedAccounts: number;
  deletedAccounts: number;
  onlineNow: number;
  moderatorCount: number;
  adminCount: number;
  hiddenPosts: number;
  hiddenComments: number;
}

/* ------------------------- Modération de contenu -------------------------- */

/** Publication vue depuis l'onglet Modération (inclut le statut de masquage). */
export interface ModerationPost {
  id: string;
  author: { id: string; fullName: string; email: string };
  content: string | null;
  postType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'MIXED';
  hidden: boolean;
  attachments: PostAttachment[];
  visibleCommentsCount: number;
  createdAt: string;
}

/** Commentaire vu depuis l'onglet Modération. */
export interface ModerationComment {
  id: string;
  postId: string;
  postAuthorId: string;
  parentId: string | null;
  author: { id: string; fullName: string; email: string };
  content: string | null;
  sticker: string | null;
  hidden: boolean;
  createdAt: string;
}

export type AdminActionTypeValue =
  | 'WARN' | 'SUSPEND' | 'REACTIVATE' | 'BAN' | 'SOFT_DELETE'
  | 'ROLE_CHANGE' | 'PASSWORD_RESET'
  | 'HIDE_POST' | 'UNHIDE_POST' | 'DELETE_POST'
  | 'HIDE_COMMENT' | 'UNHIDE_COMMENT' | 'DELETE_COMMENT';

/** Entrée du journal des actions d'administration (« Qui a fait quoi, quand »). */
export interface AdminActionEntry {
  id: string;
  actionType: AdminActionTypeValue;
  actorId: string | null;
  actorName: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  objectId: string | null;
  description: string;
  createdAt: string;
}
