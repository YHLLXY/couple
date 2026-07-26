export type NotificationType = 'wish_new' | 'wish_accepted' | 'wish_done' | 'checkin_remind' | 'anniversary';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  relatedId?: string;
}