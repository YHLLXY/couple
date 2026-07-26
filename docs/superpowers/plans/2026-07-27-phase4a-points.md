# 阶段 4a：积分系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现可配置积分系统——赚积分（完成心愿/签到/贴纸）、兑奖励（创建→申请→确认三步流程）、等级体系、积分流水。

**Architecture:** 新增 `src/modules/points/` 插件模块（不占 TabBar），Pinia store 管理数据，通过动态 `import()` 与 wish/interact/notify store 联动。积分规则可增删改、种子数据提供开箱体验。

**Tech Stack:** Vue 3 + Pinia + Vant 4 + localStorage（core/storage.ts）+ 现有插件架构

---

## 文件结构

```
src/modules/points/
├── index.ts              # 模块注册（tabBar: false）
├── types.ts              # PointsRule, Reward, ExchangeRecord, PointsLedger
├── routes.ts             # /points, /points/rewards
├── store.ts              # Pinia store — 余额、规则、奖励、兑换、账本
├── views/
│   ├── PointsHome.vue    # 积分主页（余额+等级+规则+流水）
│   └── RewardShop.vue    # 奖励商店（兑换+记录，两个Tab）
└── components/
    ├── PointsBadge.vue   # 积分徽章（余额+等级，复用组件）
    └── RewardCard.vue    # 奖励卡片

修改文件:
  src/modules/wish/store.ts      — updateWishStatus('done') 时调用 earnPoints
  src/modules/interact/store.ts  — doCheckIn() / addSticker() 时调用 earnPoints
  src/modules/user/views/UserHome.vue — 加积分徽章 + 积分中心入口

不修改:
  core/  notify/  calendar/  theme/
```

---

### Task 1: 类型定义 + 路由 + 模块注册

**Files:**
- Create: `src/modules/points/types.ts`
- Create: `src/modules/points/routes.ts`
- Create: `src/modules/points/index.ts`

- [ ] **Step 1: 创建 types.ts**

```ts
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
```

- [ ] **Step 2: 创建 routes.ts**

```ts
// src/modules/points/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const pointsRoutes: RouteRecordRaw[] = [
  {
    path: '/points',
    name: 'points',
    component: () => import('./views/PointsHome.vue'),
    meta: { title: '积分中心', showBack: true },
  },
  {
    path: '/points/rewards',
    name: 'rewards',
    component: () => import('./views/RewardShop.vue'),
    meta: { title: '奖励商店', showBack: true },
  },
];
```

- [ ] **Step 3: 创建 index.ts（模块注册）**

```ts
// src/modules/points/index.ts
import { registerModule } from '@/core/registry';
import { pointsRoutes } from './routes';

registerModule({
  id: 'points',
  name: '积分',
  routes: pointsRoutes,
  tabBar: false,
  enabled: true,
});
```

- [ ] **Step 4: 确保 main.ts 自动加载模块**

模块通过 side-effect import 自动注册。检查 `src/main.ts` 是否已有通配导入模式：

```ts
// 现有 main.ts 片段 — 每个模块一行 import
import '@/modules/interact';
import '@/modules/wish';
import '@/modules/calendar';
import '@/modules/user';
import '@/modules/theme';
import '@/modules/notify';
```

确认后，在 Step 8（收尾）中加 `import '@/modules/points'`。

- [ ] **Step 5: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 types.ts / routes.ts / index.ts 相关的类型错误

- [ ] **Step 6: 提交**

```bash
git add src/modules/points/types.ts src/modules/points/routes.ts src/modules/points/index.ts
git commit -m "feat(points): add types, routes, and module registration"
```

---

### Task 2: Points Store

**Files:**
- Create: `src/modules/points/store.ts`

- [ ] **Step 1: 创建 store.ts**

```ts
// src/modules/points/store.ts
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
      reason: `${rule.label}`,
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
    currentUserId,  // 暴露当前用户 ID 获取函数
    earnPoints, spendPoints,
    addRule, updateRule, removeRule,
    createReward, toggleReward,
    requestExchange, confirmExchange, cancelExchange,
  };
});
```

- [ ] **Step 2: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: store.ts 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/modules/points/store.ts
git commit -m "feat(points): add points store — balance, rules, rewards, exchange flow, ledger"
```

---

### Task 3: PointsBadge + RewardCard 组件

**Files:**
- Create: `src/modules/points/components/PointsBadge.vue`
- Create: `src/modules/points/components/RewardCard.vue`

- [ ] **Step 1: 创建 PointsBadge.vue**

```vue
<!-- src/modules/points/components/PointsBadge.vue -->
<script setup lang="ts">
import { usePointsStore } from '../store';

const pointsStore = usePointsStore();
</script>

<template>
  <div class="points-badge" @click="$router.push('/points')">
    <span class="points-badge__icon">🪙</span>
    <span class="points-badge__value">{{ pointsStore.currentBalance }}</span>
    <span class="points-badge__level">{{ pointsStore.currentLevel.name }}</span>
  </div>
</template>

<style scoped>
.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #fff;
  box-shadow: 0 2px 6px rgba(255, 170, 0, 0.3);
}

.points-badge__icon { font-size: 14px; }

.points-badge__value { min-width: 20px; text-align: center; }

.points-badge__level {
  opacity: 0.9;
  font-size: 11px;
  font-weight: var(--font-weight-normal);
}
</style>
```

- [ ] **Step 2: 创建 RewardCard.vue**

```vue
<!-- src/modules/points/components/RewardCard.vue -->
<script setup lang="ts">
import type { Reward } from '../types';

defineProps<{
  reward: Reward;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [reward: Reward];
}>();
</script>

<template>
  <div
    class="reward-card"
    :class="{ 'reward-card--disabled': disabled }"
    @click="!disabled && emit('click', reward)"
  >
    <div class="reward-card__icon">{{ reward.icon }}</div>
    <div class="reward-card__title">{{ reward.title }}</div>
    <div class="reward-card__cost">
      <span class="reward-card__coin">🪙</span>
      {{ reward.cost }}
    </div>
    <div v-if="disabled" class="reward-card__badge">已下架</div>
  </div>
</template>

<style scoped>
.reward-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.reward-card:active { transform: scale(0.95); }

.reward-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reward-card__icon { font-size: 32px; }

.reward-card__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  text-align: center;
  line-height: 1.3;
}

.reward-card__cost {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary, #FF7A95);
}

.reward-card__coin { font-size: 14px; }

.reward-card__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  padding: 1px 6px;
  background: var(--color-text-secondary);
  color: #fff;
  border-radius: var(--radius-full);
}
</style>
```

- [ ] **Step 3: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无组件相关错误

- [ ] **Step 4: 提交**

```bash
git add src/modules/points/components/
git commit -m "feat(points): add PointsBadge and RewardCard components"
```

---

### Task 4: PointsHome 页面

**Files:**
- Create: `src/modules/points/views/PointsHome.vue`

- [ ] **Step 1: 创建 PointsHome.vue**

```vue
<!-- src/modules/points/views/PointsHome.vue -->
<script setup lang="ts">
import { usePointsStore } from '../store';
import PointsBadge from '../components/PointsBadge.vue';

const pointsStore = usePointsStore();
</script>

<template>
  <div class="points-page">
    <!-- 余额区域 -->
    <div class="balance-section">
      <div class="balance-ring">
        <span class="balance-amount">{{ pointsStore.currentBalance }}</span>
        <span class="balance-unit">积分</span>
      </div>
      <div class="balance-level">{{ pointsStore.currentLevel.name }}</div>
      <div class="balance-next">
        <template v-if="pointsStore.currentLevel.level < 5">
          距离下一级还需 {{ (pointsStore.currentLevel.level * 150) - pointsStore.currentBalance > 0 ? (pointsStore.currentLevel.level * 150) - pointsStore.currentBalance : 0 }} 分
        </template>
        <template v-else>已达最高等级 🎉</template>
      </div>
    </div>

    <!-- 积分规则 -->
    <div class="section">
      <h3 class="section-title">🎯 积分规则</h3>
      <div class="rules-list">
        <div v-for="rule in pointsStore.rules" :key="rule.id" class="rule-item">
          <div class="rule-info">
            <span class="rule-label">{{ rule.label }}</span>
            <span v-if="rule.cooldown > 0" class="rule-cooldown">{{ rule.cooldown }}h冷却</span>
          </div>
          <span class="rule-points" :class="{ 'rule-points--off': !rule.enabled }">
            {{ rule.enabled ? `+${rule.points}` : '已关闭' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 近期流水 -->
    <div class="section">
      <h3 class="section-title">📋 积分流水</h3>
      <div v-if="pointsStore.recentLedger.length === 0" class="empty-hint">
        还没有积分记录
      </div>
      <div v-for="item in pointsStore.recentLedger" :key="item.id" class="ledger-item">
        <div class="ledger-left">
          <span class="ledger-reason">{{ item.reason }}</span>
          <span class="ledger-time">{{ new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
        <span class="ledger-amount" :class="item.amount > 0 ? 'ledger-amount--earn' : 'ledger-amount--spend'">
          {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
        </span>
      </div>
    </div>

    <!-- 前往奖励商店 -->
    <div class="bottom-action">
      <van-button type="primary" round block @click="$router.push('/points/rewards')">
        🎁 奖励商店
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.points-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

/* 余额区域 */
.balance-section {
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  margin-bottom: var(--space-base);
  background: linear-gradient(135deg, #fff9e6, #fff3cc);
  border-radius: var(--radius-md);
}

.balance-ring {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #fff;
  box-shadow: 0 4px 16px rgba(255, 170, 0, 0.35);
  margin-bottom: var(--space-sm);
}

.balance-amount {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.balance-unit {
  font-size: var(--font-size-xs);
  opacity: 0.85;
}

.balance-level {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.balance-next {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* 通用 section */
.section {
  margin-bottom: var(--space-base);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

/* 规则 */
.rules-list {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-base);
  border-bottom: 1px solid var(--color-border, #f0f0f0);
}

.rule-item:last-child { border-bottom: none; }

.rule-info { display: flex; align-items: center; gap: 8px; }

.rule-label { font-size: var(--font-size-sm); color: var(--color-text-primary); }

.rule-cooldown {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.rule-points {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #ffaa00;
}

.rule-points--off {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

/* 流水 */
.ledger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border, #f0f0f0);
}

.ledger-item:last-child { border-bottom: none; }

.ledger-left { display: flex; flex-direction: column; gap: 2px; }

.ledger-reason { font-size: var(--font-size-sm); color: var(--color-text-primary); }

.ledger-time { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.ledger-amount { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }

.ledger-amount--earn { color: #4caf50; }

.ledger-amount--spend { color: var(--color-danger, #f44336); }

.empty-hint {
  text-align: center;
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 底部 */
.bottom-action {
  margin-top: var(--space-base);
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: PointsHome.vue 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/modules/points/views/PointsHome.vue
git commit -m "feat(points): add PointsHome view — balance, level, rules list, ledger"
```

---

### Task 5: RewardShop 页面

**Files:**
- Create: `src/modules/points/views/RewardShop.vue`

- [ ] **Step 1: 创建 RewardShop.vue**

```vue
<!-- src/modules/points/views/RewardShop.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { showActionSheet, showDialog, showToast } from 'vant';
import { usePointsStore } from '../store';
import RewardCard from '../components/RewardCard.vue';
import type { Reward, ExchangeRecord } from '../types';

const pointsStore = usePointsStore();
const activeTab = ref<'exchange' | 'history'>('exchange');
const showCreate = ref(false);
const newTitle = ref('');
const newCost = ref(5);
const newIcon = ref('🎁');

// 对方创建的奖励（我可以兑换的）
const canExchange = computed(() => pointsStore.availableRewards);

// 我创建的奖励
const myRewards = computed(() => pointsStore.myRewards);

// 待确认：我是奖励创建者，有人申请兑换我的奖励
const pendingForMe = computed(() => {
  const uid = pointsStore.currentUserId();
  return pointsStore.exchanges.filter(e => {
    const reward = pointsStore.rewards.find(r => r.id === e.rewardId);
    return reward && reward.creatorId === uid && e.status === 'pending_confirm';
  });
});

// 我发起的兑换
const myRequests = computed(() => {
  const uid = pointsStore.currentUserId();
  return pointsStore.exchanges.filter(e => e.userId === uid);
});

// 历史记录（已完成的）
const doneHistory = computed(() =>
  pointsStore.exchanges.filter(e => e.status === 'done')
);

const rewardIcons = ['🎁', '💆', '🍳', '🎮', '🧹', '🎬', '🍰', '💐', '🎵', '📖'];

function handleExchange(reward: Reward) {
  showActionSheet({
    title: `确认兑换「${reward.title}」？`,
    description: `将消耗 ${reward.cost} 积分`,
    actions: [
      {
        name: `兑换（消耗${reward.cost}分）`,
        callback: () => {
          const result = pointsStore.requestExchange(reward.id);
          if (result) {
            showToast('已发送兑换请求，等待对方确认');
          } else {
            showToast('积分不足或兑换失败');
          }
        },
      },
    ],
    cancelText: '取消',
  });
}

function handleConfirm(exchange: ExchangeRecord) {
  const reward = pointsStore.rewards.find(r => r.id === exchange.rewardId);
  showDialog({
    title: '确认兑现？',
    message: `确认后将扣除对方 ${reward?.cost ?? 0} 积分`,
  }).then(() => {
    pointsStore.confirmExchange(exchange.id);
    showToast('已确认兑现！');
  }).catch(() => {});
}

function handleCancel(exchange: ExchangeRecord) {
  showDialog({
    title: '拒绝兑换？',
    message: '对方会看到兑换被取消',
  }).then(() => {
    pointsStore.cancelExchange(exchange.id);
    showToast('已取消');
  }).catch(() => {});
}

function handleCreateReward() {
  if (!newTitle.value.trim()) {
    showToast('请输入奖励名称');
    return;
  }
  pointsStore.createReward(newTitle.value.trim(), newCost.value, newIcon.value);
  showToast('奖励已创建！');
  showCreate.value = false;
  newTitle.value = '';
  newCost.value = 5;
  newIcon.value = '🎁';
}

function handleToggleReward(reward: Reward) {
  pointsStore.toggleReward(reward.id);
}

function getRewardById(id: string): Reward | undefined {
  return pointsStore.rewards.find(r => r.id === id);
}

function getUserName(userId: string): string {
  return userId === 'user_a' ? '小兔子' : '小熊';
}
</script>

<template>
  <div class="reward-shop">
    <!-- Tab 切换 -->
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="兑换奖励" name="exchange" />
      <van-tab title="兑换记录" name="history" />
    </van-tabs>

    <!-- Tab 1: 兑换奖励 -->
    <div v-show="activeTab === 'exchange'" class="tab-content">
      <!-- 我创建的 -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">📦 我创建的</h3>
          <van-button size="small" type="primary" round @click="showCreate = true">
            + 新建
          </van-button>
        </div>
        <div class="reward-scroll" v-if="myRewards.length > 0">
          <div v-for="reward in myRewards" :key="reward.id" class="scroll-item">
            <RewardCard :reward="reward" @click="handleToggleReward(reward)" />
            <span class="scroll-item__status">{{ reward.enabled ? '上架中' : '已下架' }}</span>
          </div>
        </div>
        <div v-else class="empty-hint">还没有创建奖励</div>
      </div>

      <!-- 我可以兑换的（对方创建的） -->
      <div class="section">
        <h3 class="section-title">🛍️ 可以兑换的</h3>
        <div class="reward-grid" v-if="canExchange.length > 0">
          <RewardCard
            v-for="reward in canExchange"
            :key="reward.id"
            :reward="reward"
            @click="handleExchange(reward)"
          />
        </div>
        <div v-else class="empty-hint">对方还没有创建奖励</div>
      </div>
    </div>

    <!-- Tab 2: 兑换记录 -->
    <div v-show="activeTab === 'history'" class="tab-content">
      <!-- 待确认 -->
      <div v-if="pendingForMe.length > 0" class="section">
        <h3 class="section-title">⏳ 待确认</h3>
        <div v-for="ex in pendingForMe" :key="ex.id" class="exchange-item exchange-item--pending">
          <div class="exchange-content">
            <span class="exchange-icon">⏳</span>
            <div class="exchange-info">
              <div class="exchange-title">
                {{ getUserName(ex.userId) }}想兑换「{{ getRewardById(ex.rewardId)?.title ?? '未知奖励' }}」
              </div>
              <div class="exchange-time">{{ new Date(ex.createdAt).toLocaleString('zh-CN') }}</div>
            </div>
          </div>
          <div class="exchange-actions">
            <van-button size="small" type="primary" round @click="handleConfirm(ex)">确认</van-button>
            <van-button size="small" round @click="handleCancel(ex)">拒绝</van-button>
          </div>
        </div>
      </div>

      <!-- 我发起的 -->
      <div v-if="myRequests.length > 0" class="section">
        <h3 class="section-title">📤 我发起的</h3>
        <div v-for="ex in myRequests" :key="ex.id" class="exchange-item">
          <div class="exchange-content">
            <span class="exchange-icon">{{ ex.status === 'done' ? '✅' : ex.status === 'cancelled' ? '❌' : '⏳' }}</span>
            <div class="exchange-info">
              <div class="exchange-title">「{{ getRewardById(ex.rewardId)?.title ?? '未知奖励' }}」</div>
              <div class="exchange-sub">
                <span class="exchange-status">{{ ex.status === 'done' ? '已兑现' : ex.status === 'cancelled' ? '已取消' : '等待确认' }}</span>
                <span class="exchange-time">{{ new Date(ex.createdAt).toLocaleString('zh-CN') }}</span>
              </div>
            </div>
          </div>
          <van-button
            v-if="ex.status === 'pending_confirm'"
            size="small"
            round
            @click="pointsStore.cancelExchange(ex.id)"
          >
            取消
          </van-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="pendingForMe.length === 0 && myRequests.length === 0" class="empty-hint">
        还没有兑换记录
      </div>
    </div>

    <!-- 新建奖励弹窗 -->
    <van-popup v-model:show="showCreate" position="bottom" :style="{ padding: '20px', borderRadius: '16px 16px 0 0' }">
      <h3 class="popup-title">创建奖励</h3>
      <div class="create-form">
        <div class="form-item">
          <label>图标</label>
          <div class="icon-picker">
            <span
              v-for="icon in rewardIcons"
              :key="icon"
              class="icon-option"
              :class="{ 'icon-option--active': newIcon === icon }"
              @click="newIcon = icon"
            >{{ icon }}</span>
          </div>
        </div>
        <div class="form-item">
          <label>奖励名称</label>
          <van-field v-model="newTitle" placeholder="如：按摩10分钟" maxlength="20" />
        </div>
        <div class="form-item">
          <label>消耗积分</label>
          <van-stepper v-model="newCost" :min="5" :max="500" :step="5" />
        </div>
        <van-button type="primary" round block @click="handleCreateReward">创建奖励</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.reward-shop {
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.tab-content {
  padding: var(--space-base);
}

.section {
  margin-bottom: var(--space-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

.section-header .section-title { margin-bottom: 0; }

/* 横向滚动奖励 */
.reward-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.scroll-item {
  flex-shrink: 0;
  width: 110px;
  text-align: center;
}

.scroll-item__status {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
  display: block;
}

/* 奖励网格 */
.reward-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* 兑换条目 */
.exchange-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  gap: 12px;
}

.exchange-item--pending {
  border-left: 3px solid #ffaa00;
}

.exchange-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.exchange-icon { font-size: 24px; flex-shrink: 0; }

.exchange-info { min-width: 0; }

.exchange-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exchange-sub {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.exchange-status {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.exchange-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.exchange-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 创建表单 */
.popup-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-align: center;
  margin-bottom: var(--space-base);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}

.form-item label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--duration-fast);
}

.icon-option--active {
  border-color: var(--color-primary, #FF7A95);
  background: #fff;
}

.empty-hint {
  text-align: center;
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `npx vue-tsc --noEmit`
Expected: RewardShop.vue 无类型错误

Run: `npx vite build`
Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
git add src/modules/points/views/RewardShop.vue
git commit -m "feat(points): add RewardShop view — exchange marketplace, create rewards, confirm flow"
```

---

### Task 6: 联动 Wish Store + Interact Store

**Files:**
- Modify: `src/modules/wish/store.ts`（第 144-187 行区域，updateWishStatus 函数）
- Modify: `src/modules/interact/store.ts`（第 59-96 行区域，doCheckIn 和 addSticker 函数）

- [ ] **Step 1: 修改 wish/store.ts — 完成心愿加积分**

在 `updateWishStatus` 函数中，`status === 'done'` 分支里，已有的通知发送逻辑之后，添加积分调用。

找到 `src/modules/wish/store.ts` 中 updateWishStatus 函数的 done 分支（约第 152-177 行）。在最后一个 `if` 块（proofNote）之后、`persist()` 附近，添加：

```ts
// 在 updateWishStatus 的 status === 'done' 分支内，
// 所有通知发送代码之后（约第 184 行之前），添加：

// 加积分
import('@/modules/points/store').then(({ usePointsStore }) => {
  // 完成心愿的是 toUserId（接收方/执行方）
  const doerId = wish!.toUserId;
  usePointsStore().earnPoints(doerId, 'wish_done');
});
```

- [ ] **Step 2: 修改 interact/store.ts — 签到加积分**

在 `doCheckIn` 函数中，添加积分调用。找到约第 59-66 行的 `doCheckIn` 函数。

```ts
// 在 doCheckIn 函数内，addActivity 之后添加：

// 加积分 + 连续签到额外奖励
import('@/modules/points/store').then(({ usePointsStore }) => {
  const uid = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
  usePointsStore().earnPoints(uid, 'checkin');
});
```

- [ ] **Step 3: 修改 interact/store.ts — 发贴纸加积分**

在 `addSticker` 函数中，已有通知发送逻辑之后，添加积分调用。

```ts
// 在 addSticker 函数内，通知发送之后（约第 95 行后），添加：

// 加积分
import('@/modules/points/store').then(({ usePointsStore }) => {
  const uid = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
  usePointsStore().earnPoints(uid, 'sticker_sent');
});
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `npx vue-tsc --noEmit`
Expected: 无新增类型错误

Run: `npx vite build`
Expected: 构建成功

- [ ] **Step 5: 提交**

```bash
git add src/modules/wish/store.ts src/modules/interact/store.ts
git commit -m "feat(points): wire up wish_done, checkin, sticker_sent to earnPoints"
```

---

### Task 7: 集成 UserHome + main.ts

**Files:**
- Modify: `src/modules/user/views/UserHome.vue`
- Modify: `src/main.ts`

- [ ] **Step 1: 修改 UserHome.vue — 加积分徽章 + 积分中心入口**

在 profile-card 下方插入积分徽章，在菜单中添加入口。

改动位置 1 — template 中，profile-card 之后：

```vue
<!-- 在 profile-card 和 partner-card 之间插入 -->
<PointsBadge />
```

改动位置 2 — template 中，菜单列表内：

```vue
<!-- 在菜单列表 van-cell 组中插入 -->
<van-cell title="🪙 积分中心" is-link to="/points" />
```

改动位置 3 — script setup 顶部添加导入：

```ts
import PointsBadge from '@/modules/points/components/PointsBadge.vue';
```

- [ ] **Step 2: 修改 main.ts — 注册 points 模块**

在 `src/main.ts` 的模块导入区域，添加：

```ts
import '@/modules/points';
```

位置在现有模块 imports 之后（如 `import '@/modules/notify'` 之后）。

- [ ] **Step 3: 类型检查 + 构建**

Run: `npx vue-tsc --noEmit`
Expected: 零错误

Run: `npx vite build`
Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add src/modules/user/views/UserHome.vue src/main.ts
git commit -m "feat(points): integrate PointsBadge into UserHome, register points module"
```

---

### Task 8: 最终验证 + README 更新

- [ ] **Step 1: 全量类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 零错误

- [ ] **Step 2: 生产构建**

Run: `npx vite build`
Expected: 构建成功，无警告

- [ ] **Step 3: 确认 core/ 零改动**

Run: `git diff --stat HEAD~7..HEAD -- src/core/`
Expected: 空输出（无 core/ 变更）

- [ ] **Step 4: 更新 README 更新日志**

在 README.md 的更新日志部分，开头添加：

```markdown
### 2026-07-27 — 阶段 4a 完成

- `feat(points)`: 积分系统 — 可配置积分规则（完成心愿+20/签到+5/贴纸+2）、等级体系（5级）、积分流水
- `feat(points)`: 奖励商店 — 创建奖励、兑换申请、确认兑现三步流程、通知联动
- `feat(points)`: PointsBadge 积分徽章、UserHome 积分入口
- `feat(wish)`: 完成心愿自动加积分
- `feat(interact)`: 签到/贴纸自动加积分
```

同时将阶段表的"阶段 4"拆分为：

```markdown
| 阶段 4a | 扩展 — 积分系统 | ✅ 完成 |
| 阶段 4b | 扩展 — 共同日记 | 📋 待开始 |
| 阶段 4c | 扩展 — 后端接入 | 📋 待开始 |
```

- [ ] **Step 5: 提交**

```bash
git add README.md
git commit -m "docs: update README with Phase 4a changelog"
```

---

## 完成检查

- [ ] 所有 8 个任务完成
- [ ] `vue-tsc --noEmit` 零错误
- [ ] `vite build` 成功
- [ ] core/ 零改动
- [ ] Git 已提交并推送
- [ ] 经验教训已记录