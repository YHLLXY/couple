export type WishStatus = 'pending' | 'accepted' | 'done' | 'postponed' | 'ignored';
export type WishCategory = 'food' | 'chore' | 'romance' | 'company' | 'surprise' | 'other';
export type WishPriority = 'normal' | 'urgent' | 'romantic';

export interface Wish {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  category: WishCategory;
  priority: WishPriority;
  status: WishStatus;
  imageUrl?: string;
  proofImageUrl?: string;
  proofNote?: string;
  createdAt: number;
  completedAt?: number;
  expireAt?: number;
}