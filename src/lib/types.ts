
import type { Timestamp } from 'firebase/firestore';

export type User = {
  uid: string;
  fullName: string;
  country: string;
  city: string;
  gender: string;
  age: number;
  avatarUrl?: string;
  galleryImages?: string[];
  about: string;
  relationshipType: 'Long-term' | 'Short-term' | 'Friendship' | 'Not sure' | 'Serious relationship';
  relationshipStatus: 'Single' | 'In a relationship' | 'Complicated' | 'Open' | 'Divorced';
  whatsapp?: string;
  email?: string;
  isAdmin?: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  joinedGroups?: string[];
  groupsLastViewed?: { [groupSlug: string]: Timestamp };
};

export type CurrentUser = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export type OtherUser = {
  uid: string;
  fullName: string;
  avatarUrl?: string;
}

export type ReactionType = 'like' | 'heart' | 'laugh';

export type Post = {
  id: string;
  author: Partial<User>;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  isCentered?: boolean;
  createdAt: Timestamp | Date;
  reactions?: {
    [key in ReactionType]?: number;
  };
  userReactions?: {
    [userId: string]: ReactionType;
  };
  type: 'text_post' | 'avatar_update' | 'gallery_image_post';
  imageUrl?: string;
  caption?: string;
};

export type Comment = {
  id: string;
  text: string;
  author: Partial<User>;
  createdAt: Timestamp | Date;
};

export type ReplyContext = {
    id:string;
    text: string;
    senderName: string;
};

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type Message = {
    id: string;
    sender: Partial<User>;
    text: string;
    timestamp: string;
    isOwn: boolean;
    replyTo?: ReplyContext;
    status: MessageStatus;
};

export type GroupMessage = {
    id: string;
    sender: Partial<User>;
    text: string;
    timestamp: any;
    isOwn: boolean;
    replyTo?: ReplyContext;
}

export type Chat = {
    id: string;
    user: User;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}
