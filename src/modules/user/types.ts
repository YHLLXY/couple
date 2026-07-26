export interface User {
  id: string;
  openId?: string;
  nickname: string;
  avatar: string;
  partnerId?: string;
  coupleCode?: string;
  createdAt: number;
}

export interface UserState {
  currentUser: User | null;
  partner: User | null;
  isBound: boolean;
}