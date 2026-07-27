// 与 Supabase auth.users 对应
export interface User {
  id: string;              // Supabase Auth UUID
  email: string;           // 登录邮箱
  name: string;            // 昵称（小兔子/小熊）
  avatar: string;          // 头像 emoji（🐰/🐻）
  coupleId: string | null; // 所属情侣对 ID
  createdAt: number;
}

export interface UserState {
  currentUser: User | null;
  partner: User | null;
  isBound: boolean;
  isLoggedIn: boolean;
}