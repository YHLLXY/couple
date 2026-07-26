import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PointsRule, Reward, ExchangeRecord, PointsLedger } from './types';
import { LEVEL_CONFIG } from './types';
import { storage } from '@/core/storage';

const STORAGE_PREFIX = 'points';

// === 种子数据 ===
function seedRules(): PointsRule[] {
  return [
    { id: 'r1', action: 'wish_done', label: '完成心愿', points: 20, enabled: true, cooldown: 0 },
    { id: 'r2', action: 'checkin', label: '每日签到', points: 5, enabled: true, cooldown: 24 },
    { id: 'r3', action: 'sticker_sent', label: '发贴纸', points: 2, enabled: true, cooldown: 1 },
  ];
}

function seedRewards(): Reward[] {
  const now = Date.now();
  return [
    { id: 'rd1', creatorId: 'user_a', title: '💆 按摩10分钟', cost: 50, icon: '💆', enabled: true, createdAt: now },
    { id: 'rd2', creatorId: 'user_b', title: '🍳 做一顿早餐', cost: 60, icon: '🍳', enabled: true, createdAt: now },
    { id: 'rd3', creatorId: 'user_a', title: '🎮 陪打游戏1小时', cost: 40, icon: '🎮', enabled: true, createdAt: now },
    { id: 'rd4', creatorId: 'user_b', title: '🧹 帮我打扫房间', cost: 80, icon: '🧹', enabled: true, createdAt: now },
  ];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getLevel(balance: number) {
  const levels = [...LEVEL_CONFIG].reverse();
  return levels.find(l => balance >= l.min) ?? LEVEL_CONFIG[0];
}

export const usePointsStore = defineStore('points', () => {
  // === 状态（localStorage 持久化） ===
  const balance = ref<Record<string, number>>(
    storage.get<Record<string, number>>(`${STORAGE_PREFIX}_balance`, { user_a: 0, user_b: 0 }) ?? { user_a: 0, user_b: 0 }
  );
  const rules = ref<PointsRule[]>(
    storage.get<PointsRule[]>(`${STORAGE_PREFIX}_rules`) ?? seedRules()
  );
  const rewards = ref<Reward[]>(
    storage.get<Reward[]>(`${STORAGE_PREFIX}_rewards`) ?? seedRewards()
  );
  const exchanges = ref<ExchangeRecord[]>(
    storage.get<ExchangeRecord[]>(`${STORAGE_PREFIX}_exchanges`, []) ?? []
  );
  const ledger = ref<PointsLedger[]>(
    storage.get<PointsLedger[]>(`${STORAGE_PREFIX}_ledger`, []) ?? []
  );

  // === 当前用户（从 localStorage 读取，避免跨 store 依赖） ===
  function currentUserId(): string {
    return storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
  }

  // === 计算属性 ===
  const currentBalance = computed(() => balance.value[currentUserId()] ?? 0);

  const currentLevel = computed(() => getLevel(currentBalance.value));

  const availableRewards = computed(() =>
    rewards.value.filter(r => r.enabled && r.creatorId !== currentUserId())
  );

  const myRewards = computed(() =>
    rewards.value.filter(r => r.creatorId === currentUserId())
  );

  const pendingExchanges = computed(() =>
    exchanges.value.filter(e => e.status === 'pending_confirm')
  );

  const recentLedger = computed(() =>
    ledger.value
      .filter(l => l.userId === currentUserId())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
  );

  // === 持久化 ===
  function save() {
    storage.set(`${STORAGE_PREFIX}_balance`, balance.value);
    storage.set(`${STORAGE_PREFIX}_rules`, rules.value);
    storage.set(`${STORAGE_PREFIX}_rewards`, rewards.value);
    storage.set(`${STORAGE_PREFIX}_exchanges`, exchanges.value);
    storage.set(`${STORAGE_PREFIX}_ledger`, ledger.value);
  }

  // === 积分操作 ===
  function earnPoints(userId: string, action: string): number {
    const rule = rules.value.find(r => r.action === action && r.enabled);
    if (!rule) return 0;

    // 冷却检查
    if (rule.cooldown > 0) {
      const recent = ledger.value.find(
        l => l.userId === userId && l.ruleId === rule.id &&
        (Date.now() - l.createdAt) < rule.cooldown * 3600000
      );
      if (recent) return 0; // 冷却中，不加分
    }

    const pts = rule.points;
    balance.value[userId] = (balance.value[userId] ?? 0) + pts;

    ledger.value.push({
      id: genId('pl'),
      userId,
      amount: pts,
      reason: rule.label,
      ruleId: rule.id,
      createdAt: Date.now(),
    });

    save();
    return pts;
  }

  function spendPoints(userId: string, amount: number, reason: string, exchangeId: string): boolean {
    if ((balance.value[userId] ?? 0) < amount) return false;

    balance.value[userId] -= amount;

    ledger.value.push({
      id: genId('pl'),
      userId,
      amount: -amount,
      reason,
      exchangeId,
      createdAt: Date.now(),
    });

    save();
    return true;
  }

  // === 规则管理 ===
  function addRule(rule: PointsRule) {
    rules.value.push(rule);
    save();
  }

  function updateRule(id: string, patch: Partial<PointsRule>) {
    const idx = rules.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      rules.value[idx] = { ...rules.value[idx], ...patch };
      save();
    }
  }

  function removeRule(id: string) {
    rules.value = rules.value.filter(r => r.id !== id);
    save();
  }

  // === 奖励管理 ===
  function createReward(title: string, cost: number, icon: string): Reward {
    const reward: Reward = {
      id: genId('rd'),
      creatorId: currentUserId(),
      title: `${icon} ${title}`,
      cost,
      icon,
      enabled: true,
      createdAt: Date.now(),
    };
    rewards.value.push(reward);
    save();
    return reward;
  }

  function toggleReward(id: string) {
    const reward = rewards.value.find(r => r.id === id);
    if (reward) {
      reward.enabled = !reward.enabled;
      save();
    }
  }

  // === 兑换流程 ===
  function requestExchange(rewardId: string): ExchangeRecord | null {
    const reward = rewards.value.find(r => r.id === rewardId);
    if (!reward || !reward.enabled) return null;
    if (reward.creatorId === currentUserId()) return null; // 不能兑换自己创建的

    if ((balance.value[currentUserId()] ?? 0) < reward.cost) return null;

    const record: ExchangeRecord = {
      id: genId('ex'),
      rewardId,
      userId: currentUserId(),
      status: 'pending_confirm',
      createdAt: Date.now(),
    };
    exchanges.value.push(record);
    save();

    // 通知奖励创建者
    import('@/modules/notify/store').then(({ useNotifyStore }) => {
      const fromUser = currentUserId() === 'user_a' ? '小兔子' : '小熊';
      useNotifyStore().addNotification(
        'exchange_request',
        `${fromUser}想兑换奖励`,
        `${fromUser}想兑换「${reward.title}」`,
        rewardId,
      );
    });

    return record;
  }

  function confirmExchange(exchangeId: string): boolean {
    const record = exchanges.value.find(e => e.id === exchangeId);
    if (!record || record.status !== 'pending_confirm') return false;

    const reward = rewards.value.find(r => r.id === record.rewardId);
    if (!reward) return false;

    // 只有奖励创建者可以确认
    if (reward.creatorId !== currentUserId()) return false;

    // 扣发起者积分
    const ok = spendPoints(record.userId, reward.cost, `兑换：${reward.title}`, exchangeId);
    if (!ok) return false;

    record.status = 'done';
    record.confirmedAt = Date.now();
    save();

    // 通知兑换发起者
    import('@/modules/notify/store').then(({ useNotifyStore }) => {
      const confirmer = currentUserId() === 'user_a' ? '小兔子' : '小熊';
      useNotifyStore().addNotification(
        'exchange_done',
        '奖励已兑现！',
        `${confirmer}确认了「${reward.title}」的兑换`,
        record.rewardId,
      );
    });

    return true;
  }

  function cancelExchange(exchangeId: string) {
    const record = exchanges.value.find(e => e.id === exchangeId);
    if (!record) return;

    // 发起者可以取消，奖励创建者也可以拒绝
    const uid = currentUserId();
    if (record.userId !== uid) {
      const reward = rewards.value.find(r => r.id === record.rewardId);
      if (!reward || reward.creatorId !== uid) return;
    }

    record.status = 'cancelled';
    save();
  }

  return {
    balance, rules, rewards, exchanges, ledger,
    currentBalance, currentLevel, availableRewards, myRewards, pendingExchanges, recentLedger,
    currentUserId,
    earnPoints, spendPoints,
    addRule, updateRule, removeRule,
    createReward, toggleReward,
    requestExchange, confirmExchange, cancelExchange,
  };
});