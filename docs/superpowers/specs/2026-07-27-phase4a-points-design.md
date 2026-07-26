# 阶段 4a：积分系统 — 设计文档

> 文档版本：v1.0 | 日期：2026-07-27 | 项目：小甜豆

---

## 一、目标

实现可配置的积分系统：用户通过完成心愿、签到、发贴纸等行为赚取积分，用积分兑换情侣自定义奖励。积分规则可增删改。

---

## 二、决策

| 决策 | 结论 |
|------|------|
| 积分来源 | 完成心愿 +20 / 每日签到 +5（连续7天额外+10） / 发贴纸 +2（1h冷却） |
| 积分规则 | 可配置——增删改行为类型和分值 |
| 积分用途 | 兑换情侣自定义奖励 |
| 创建奖励 | 谁都能创建，但只能兑换**对方**创建的 |
| 兑换流程 | 发起 → 对方确认 → 扣分 |
| 模块位置 | `src/modules/points/`，不占 TabBar |
| core/ | 不改 |

---

## 三、模块设计

### 3.1 文件结构

```
src/modules/points/
├── index.ts              # 注册模块（tabBar: false）
├── types.ts              # 积分规则、奖励、兑换记录类型
├── store.ts              # 积分余额、规则配置、奖励管理、兑换流程
├── views/
│   ├── PointsHome.vue    # 积分主页（余额 + 等级 + 积分流水）
│   └── RewardShop.vue    # 奖励商店（展示可用奖励 + 兑换历史）
└── components/
    ├── PointsBadge.vue   # 积分徽章（复用，显示余额+等级）
    └── RewardCard.vue    # 奖励卡片
```

### 3.2 积分规则（可配置）

```ts
// types.ts
interface PointsRule {
  id: string;
  action: string;        // 'wish_done' | 'checkin' | 'sticker_sent' | 未来扩展
  label: string;         // "完成心愿"
  points: number;        // 分值
  enabled: boolean;      // 可开关
  cooldown?: number;     // 冷却时间（小时），0 = 无冷却
}
```

**默认规则（3条种子数据）：**

| id | action | label | points | cooldown |
|----|--------|-------|:------:|:--------:|
| r1 | wish_done | 完成心愿 | 20 | 0 |
| r2 | checkin | 每日签到 | 5 | 24 |
| r3 | sticker_sent | 发贴纸 | 2 | 1 |

签到连续7天额外奖励 +10 分（硬编码逻辑，不算独立规则）。

### 3.3 奖励商店

```ts
interface Reward {
  id: string;
  creatorId: string;    // 谁创建的 → 只能对方兑换
  title: string;        // "按摩 10 分钟"
  cost: number;         // 消耗积分
  icon: string;         // "💆"
  enabled: boolean;     // 可下架
  createdAt: number;
}
```

**内置 4 条种子奖励（提供灵感）：**

| 创建者 | 奖励 | 消耗 |
|--------|------|:---:|
| 小兔子 | 💆 按摩10分钟 | 50 |
| 小熊 | 🍳 做一顿早餐 | 60 |
| 小兔子 | 🎮 陪打游戏1小时 | 40 |
| 小熊 | 🧹 帮我打扫房间 | 80 |

**创建奖励：** 任何一方都可以创建奖励。奖励创建后出现在"奖励商店"中，对方可以看到并兑换。

**兑换流程（三步）：**
1. TA 点击"兑换" → 创建 ExchangeRecord（status: pending_confirm），积分暂时不扣
2. 创建者收到通知："小熊想兑换「按摩10分钟」" → 点击"确认兑现"
3. 确认后 TA 扣积分，记录变为 done，双方都能看到

```ts
interface ExchangeRecord {
  id: string;
  rewardId: string;
  userId: string;         // 谁发起的兑换
  status: 'pending_confirm' | 'done' | 'cancelled';
  createdAt: number;
  confirmedAt?: number;
}
```

### 3.4 积分账本

```ts
interface PointsLedger {
  id: string;
  userId: string;
  amount: number;         // 正=赚，负=花
  reason: string;         // "完成心愿：想吃番茄炒蛋"
  ruleId?: string;        // 关联积分规则
  exchangeId?: string;    // 关联兑换记录
  createdAt: number;
}
```

### 3.5 Store 设计

```ts
export const usePointsStore = defineStore('points', () => {
  // === 状态 ===
  const balance = ref<Record<string, number>>({ user_a: 0, user_b: 0 });  // 各用户余额
  const rules = ref<PointsRule[]>(seedRules());
  const rewards = ref<Reward[]>(seedRewards());
  const exchanges = ref<ExchangeRecord[]>([]);
  const ledger = ref<PointsLedger[]>([]);

  // === 计算 ===
  const currentBalance = computed(() => balance.value[currentUserId] ?? 0);
  const currentLevel = computed(() => getLevel(currentBalance.value));  // 等级
  const availableRewards = computed(() =>
    rewards.value.filter(r => r.enabled && r.creatorId !== currentUserId)
  );  // 对方创建的奖励
  const myRewards = computed(() =>
    rewards.value.filter(r => r.creatorId === currentUserId)
  );  // 我创建的奖励
  const pendingExchanges = computed(() =>
    exchanges.value.filter(e => e.status === 'pending_confirm')
  );

  // === 方法 ===
  function earnPoints(userId: string, ruleId: string): void;    // 加积分
  function spendPoints(userId: string, amount: number): boolean; // 扣积分（余额不足返回false）
  function addRule(rule: PointsRule): void;
  function updateRule(id: string, patch: Partial<PointsRule>): void;
  function removeRule(id: string): void;
  function createReward(title: string, cost: number, icon: string): Reward;
  function toggleReward(id: string): void;     // 上架/下架
  function requestExchange(rewardId: string): ExchangeRecord | null;
  function confirmExchange(exchangeId: string): boolean;
  function cancelExchange(exchangeId: string): void;
  function getLedger(userId: string): PointsLedger[];
});
```

**等级计算：**
| 等级 | 名称 | 积分门槛 |
|:---:|------|:---:|
| 1 | 🌱 初识 | 0 |
| 2 | 🌿 萌芽 | 50 |
| 3 | 🌳 热恋 | 150 |
| 4 | 💎 钻石 | 300 |
| 5 | 👑 永恒 | 600 |

### 3.6 与已有模块的联动

```
wish store —— updateWishStatus('done') → pointsStore.earnPoints(userId, 'wish_done')
interact store —— doCheckIn() → pointsStore.earnPoints(userId, 'checkin')
interact store —— addSticker() → pointsStore.earnPoints(userId, 'sticker_sent')
points store —— requestExchange() → notify store 通知奖励创建者
points store —— confirmExchange() → notify store 通知兑换发起者
```

### 3.7 UI 设计

**PointsHome.vue（积分主页）：**
- 顶部：大积分余额数字 + 等级徽章
- 积分规则列表（显示每条规则的名称和分值）
- 近期积分流水（最近20条收支记录，正负分颜色区分）

**RewardShop.vue（奖励商店）：**
- 顶部：两个 Tab——「兑换奖励」「兑换记录」
- 「兑换奖励」Tab：
  - 上方："我创建的"横向滚动奖励卡片 + 新建按钮
  - 下方："可以兑换的"对方创建的奖励网格
  - 点击奖励 → Vant ActionSheet：确认兑换 → 发送通知给对方
- 「兑换记录」Tab：
  - 待确认列表（对方兑换了我的奖励，我需确认）
  - 历史记录列表（已完成/已取消）

**改造 UserHome.vue：**
- 用户信息卡片下方新增积分余额显示（PointsBadge 组件）
- 菜单新增"积分中心"入口

**改造 NavBar（AppShell.vue）：**
- 身份切换器旁边显示小积分徽章（可选，只在积分>0时显示）

---

## 四、文件清单

| 操作 | 文件 |
|:--:|------|
| 新建 | `src/modules/points/index.ts` |
| 新建 | `src/modules/points/types.ts` |
| 新建 | `src/modules/points/store.ts` |
| 新建 | `src/modules/points/views/PointsHome.vue` |
| 新建 | `src/modules/points/views/RewardShop.vue` |
| 新建 | `src/modules/points/components/PointsBadge.vue` |
| 新建 | `src/modules/points/components/RewardCard.vue` |
| 改动 | `src/modules/wish/store.ts`（完成心愿 → earnPoints） |
| 改动 | `src/modules/interact/store.ts`（签到/贴纸 → earnPoints） |
| 改动 | `src/modules/user/views/UserHome.vue`（加积分入口） |
| 不改 | core/、notify/、calendar/、theme/ |

---

## 五、完成标准

- [ ] 积分规则可增删改，默认3条规则
- [ ] 完成心愿/签到/发贴纸自动加积分
- [ ] 积分余额和等级正确显示
- [ ] 奖励创建/上架/下架可用
- [ ] 兑换三步流程可用（发起 → 确认 → 扣分）
- [ ] 兑换通知正确发送
- [ ] 积分流水记录完整
- [ ] `vue-tsc --noEmit` 零错误
- [ ] `vite build` 成功
- [ ] core/ 零改动