export type NotificationType = 'wish_new' | 'wish_accepted' | 'wish_done' | 'checkin_remind' | 'anniversary' | 'exchange_request' | 'exchange_done';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  relatedId?: string;
}