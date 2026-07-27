import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PointsRule, Reward, ExchangeRecord, PointsLedger } from './types';
import { LEVEL_CONFIG } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getLevel(balance: number) {
  const levels = [...LEVEL_CONFIG].reverse();
  return levels.find(l => balance >= l.min) ?? LEVEL_CONFIG[0];
}

export const usePointsStore = defineStore('points', () => {
  // === 状态 ===
  const balance = ref<Record<string, number>>({});
  const rules = ref<PointsRule[]>([
    { id: 'r1', action: 'wish_done', label: '完成心愿', points: 20, enabled: true, cooldown: 0 },
    { id: 'r2', action: 'checkin', label: '每日签到', points: 5, enabled: true, cooldown: 24 },
    { id: 'r3', action: 'sticker_sent', label: '发贴纸', points: 2, enabled: true, cooldown: 1 },
  ]);
  const rewards = ref<Reward[]>([]);
  const exchanges = ref<ExchangeRecord[]>([]);
  const ledger = ref<PointsLedger[]>([]);

  // === 当前用户 ===
  function currentUserId(): string {
    return useUserStore().currentUserId;
  }
  function currentCoupleId(): string | null {
    return useUserStore().coupleId;
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

  // === 从 Supabase 刷新余额 ===
  async function refreshBalance(): Promise<void> {
    const cid = currentCoupleId();
    if (!cid) return;
    const { data, error } = await supabase
      .from('points')
      .select('user_id, amount')
      .eq('couple_id', cid);
    if (!error && data) {
      const map: Record<string, number> = {};
      for (const row of data) {
        const uid = row.user_id as string;
        map[uid] = (map[uid] ?? 0) + (row.amount as number);
      }
      balance.value = map;
    }
  }

  // === 积分操作 ===
  async function earnPoints(userId: string, action: string): Promise<number> {
    const rule = rules.value.find(r => r.action === action && r.enabled);
    if (!rule) return 0;

    // 冷却检查（基于本地 ledger）
    if (rule.cooldown > 0) {
      const recent = ledger.value.find(
        l => l.userId === userId && l.ruleId === rule.id &&
        (Date.now() - l.createdAt) < rule.cooldown * 3600000
      );
      if (recent) return 0;
    }

    const cid = currentCoupleId();
    if (!cid) return 0;

    const pts = rule.points;
    const now = Date.now();
    const ledgerId = genId('pl');

    const { error } = await supabase.from('points').insert({
      id: ledgerId,
      couple_id: cid,
      user_id: userId,
      amount: pts,
      reason: rule.label,
      created_at: new Date().toISOString(),
    });
    if (error) return 0;

    balance.value[userId] = (balance.value[userId] ?? 0) + pts;
    ledger.value.push({
      id: ledgerId,
      userId,
      amount: pts,
      reason: rule.label,
      ruleId: rule.id,
      createdAt: now,
    });
    return pts;
  }

  async function spendPoints(userId: string, amount: number, reason: string, exchangeId: string): Promise<boolean> {
    if ((balance.value[userId] ?? 0) < amount) return false;

    const cid = currentCoupleId();
    if (!cid) return false;

    const now = Date.now();
    const ledgerId = genId('pl');

    const { error } = await supabase.from('points').insert({
      id: ledgerId,
      couple_id: cid,
      user_id: userId,
      amount: -amount,
      reason,
      created_at: new Date().toISOString(),
    });
    if (error) return false;

    balance.value[userId] -= amount;
    ledger.value.push({
      id: ledgerId,
      userId,
      amount: -amount,
      reason,
      exchangeId,
      createdAt: now,
    });
    return true;
  }

  // === 规则管理 ===
  function addRule(rule: PointsRule) {
    rules.value.push(rule);
  }

  function updateRule(id: string, patch: Partial<PointsRule>) {
    const idx = rules.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      rules.value[idx] = { ...rules.value[idx], ...patch };
    }
  }

  function removeRule(id: string) {
    rules.value = rules.value.filter(r => r.id !== id);
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
    return reward;
  }

  function toggleReward(id: string) {
    const reward = rewards.value.find(r => r.id === id);
    if (reward) {
      reward.enabled = !reward.enabled;
    }
  }

  // === 兑换流程 ===
  function requestExchange(rewardId: string): ExchangeRecord | null {
    const reward = rewards.value.find(r => r.id === rewardId);
    if (!reward || !reward.enabled) return null;
    if (reward.creatorId === currentUserId()) return null;

    if ((balance.value[currentUserId()] ?? 0) < reward.cost) return null;

    const record: ExchangeRecord = {
      id: genId('ex'),
      rewardId,
      userId: currentUserId(),
      status: 'pending_confirm',
      createdAt: Date.now(),
    };
    exchanges.value.push(record);

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

  async function confirmExchange(exchangeId: string): Promise<boolean> {
    const record = exchanges.value.find(e => e.id === exchangeId);
    if (!record || record.status !== 'pending_confirm') return false;

    const reward = rewards.value.find(r => r.id === record.rewardId);
    if (!reward) return false;

    // 只有奖励创建者可以确认
    if (reward.creatorId !== currentUserId()) return false;

    // 扣发起者积分
    const ok = await spendPoints(record.userId, reward.cost, `兑换：${reward.title}`, exchangeId);
    if (!ok) return false;

    record.status = 'done';
    record.confirmedAt = Date.now();

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
  }

  return {
    balance, rules, rewards, exchanges, ledger,
    currentBalance, currentLevel, availableRewards, myRewards, pendingExchanges, recentLedger,
    currentUserId,
    refreshBalance,
    earnPoints, spendPoints,
    addRule, updateRule, removeRule,
    createReward, toggleReward,
    requestExchange, confirmExchange, cancelExchange,
  };
});
