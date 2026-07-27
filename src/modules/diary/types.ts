export interface DiaryEntry {
  id: string;
  content: string;           // 文字内容（含 emoji Unicode）
  images: string[];          // 预留：图片 base64，暂不使用
  authorId: string;          // 'user_a' | 'user_b'
  isPrivate: boolean;        // 🔒 私密，仅作者可见
  createdAt: number;         // 时间戳
  updatedAt?: number;
}