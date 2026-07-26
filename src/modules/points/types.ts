// src/modules/points/types.ts

/** 积分规则（可配置） */
export interface PointsRule {
  id: string;
  action: string;        // 'wish_done' | 'checkin' | 'sticker_sent' | 未来扩展
  label: string;         // "完成心愿"
  points: number;        // 分值
  enabled: boolean;      // 可开关
  cooldown: number;      // 冷却时间（小时），0=无冷却
}

/** 奖励 */
export interface Reward {
  id: string;
  creatorId: string;     // 谁创建的 — 对方才能兑换
  title: string;         // "按摩 10 分钟"
  cost: number;          // 消耗积分
  icon: string;          // "💆"
  enabled: boolean;      // 可下架
  createdAt: number;
}

/** 兑换记录 */
export interface ExchangeRecord {
  id: string;
  rewardId: string;
  userId: string;        // 谁发起的兑换
  status: 'pending_confirm' | 'done' | 'cancelled';
  createdAt: number;
  confirmedAt?: number;
}

/** 积分流水 */
export interface PointsLedger {
  id: string;
  userId: string;
  amount: number;        // 正=赚，负=花
  reason: string;        // "完成心愿：想吃番茄炒蛋"
  ruleId?: string;       // 关联积分规则
  exchangeId?: string;   // 关联兑换记录
  createdAt: number;
}

/** 等级定义 */
export const LEVEL_CONFIG = [
  { level: 1, name: '🌱 初识', min: 0 },
  { level: 2, name: '🌿 萌芽', min: 50 },
  { level: 3, name: '🌳 热恋', min: 150 },
  { level: 4, name: '💎 钻石', min: 300 },
  { level: 5, name: '👑 永恒', min: 600 },
] as const;

export type LevelInfo = (typeof LEVEL_CONFIG)[number];