# 阶段 2：核心 MVP — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整心愿闭环——发心愿、卡片墙展示、接单/完成操作、身份切换、通知中心。

**Architecture:** 沿用阶段 1 插件化架构。core/ 目录完全不改。wish/user/notify 模块在现有 Pinia store 基础上重写或增强。所有数据通过 localStorage 持久化，Mock 数据作为初始种子。

**Tech Stack:** Vue 3.4+ / Vant 4 / Pinia / TypeScript / Vue Router 4

**Project Root:** `E:/homework/开发/Claudecode/couple`

---

## 文件结构（本阶段完成后）

```
src/modules/wish/
├── index.ts                    # 不改
├── routes.ts                   # 改动：+ /wish/create
├── store.ts                    # 重写：Mock数据 + localStorage + 完整CRUD
├── types.ts                    # 不改
├── views/
│   ├── WishHome.vue            # 重写：卡片墙（筛选+瀑布流）
│   └── WishCreate.vue          # 新建：发心愿表单
└── components/
    ├── WishCard.vue            # 新建：心愿卡片
    └── WishActionSheet.vue     # 新建：操作面板

src/modules/user/
├── store.ts                    # 增强：Mock用户 + 身份切换
├── views/UserHome.vue          # 重写：用户信息展示
└── components/
    └── IdentitySwitcher.vue    # 新建：身份切换面板

src/modules/notify/
├── store.ts                    # 增强：自动生成通知 + 浏览器推送
└── views/
    └── NotifyCenter.vue        # 新建：通知列表页

src/core/layout/AppShell.vue    # 改动：NavBar 右侧加通知铃铛
src/router.ts                   # 改动：+ /wish/create, /notify 路由
```

---

### Task 1: Wish Store 重写（Mock数据 + localStorage + 完整CRUD）

**Files:**
- Modify: `src/modules/wish/store.ts`（完全重写）

- [ ] **Step 1: 重写 wish store**

```ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Wish, WishStatus, WishCategory, WishPriority } from './types';
import { storage } from '@/core/storage';

const STORAGE_KEY = 'wishes';

// === Mock 种子数据 ===
function seedWishes(): Wish[] {
  const now = Date.now();
  const hour = 3600000;
  return [
    {
      id: 'w1',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '想吃你做的番茄炒蛋',
      category: 'food',
      priority: 'urgent',
      status: 'pending',
      createdAt: now - hour * 2,
      expireAt: new Date().setHours(23, 59, 59, 999),
    },
    {
      id: 'w2',
      fromUserId: 'user_a',
      toUserId: 'user_b',
      content: '今晚一起看电影吧',
      category: 'romance',
      priority: 'normal',
      status: 'accepted',
      createdAt: now - hour * 5,
    },
    {
      id: 'w3',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '帮我把衣服叠好',
      category: 'chore',
      priority: 'normal',
      status: 'done',
      createdAt: now - hour * 24,
      completedAt: now - hour * 20,
      proofNote: '叠好了！整整齐齐 ✨',
    },
    {
      id: 'w4',
      fromUserId: 'user_a',
      toUserId: 'user_b',
      content: '给我唱首歌',
      category: 'romance',
      priority: 'romantic',
      status: 'postponed',
      createdAt: now - hour * 30,
    },
    {
      id: 'w5',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '周末一起去公园散步',
      category: 'company',
      priority: 'normal',
      status: 'pending',
      createdAt: now - hour * 8,
    },
  ];
}

function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWishStore = defineStore('wish', () => {
  // 初始化：localStorage 优先，否则使用种子数据
  const stored = storage.get<Wish[]>(STORAGE_KEY);
  const wishes = ref<Wish[]>(stored && stored.length > 0 ? stored : seedWishes());

  // 筛选状态
  const statusFilter = ref<'all' | 'pending' | 'active' | 'done'>('all');

  // 当前用户视角（由 user store 注入，这里用本地引用）
  const currentUserId = ref<string>('user_a');

  function setCurrentUserId(id: string) {
    currentUserId.value = id;
  }

  // 过滤后的心愿列表（只显示与当前用户相关的）
  const filteredWishes = computed(() => {
    let list = wishes.value.filter(
      (w) => w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value,
    );
    switch (statusFilter.value) {
      case 'pending':
        list = list.filter((w) => w.status === 'pending');
        break;
      case 'active':
        list = list.filter((w) => w.status === 'accepted' || w.status === 'postponed');
        break;
      case 'done':
        list = list.filter((w) => w.status === 'done');
        break;
    }
    // 按时间倒序
    return list.sort((a, b) => b.createdAt - a.createdAt);
  });

  // 统计
  const pendingCount = computed(
    () => wishes.value.filter((w) => w.toUserId === currentUserId.value && w.status === 'pending').length,
  );
  const activeCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value) &&
          (w.status === 'accepted' || w.status === 'postponed'),
      ).length,
  );
  const doneCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value) &&
          w.status === 'done',
      ).length,
  );

  // === CRUD ===
  function addWish(data: {
    fromUserId: string;
    toUserId: string;
    content: string;
    category: WishCategory;
    priority: WishPriority;
    imageUrl?: string;
    anonymous?: boolean;
  }) {
    const wish: Wish = {
      id: generateId(),
      ...data,
      status: 'pending',
      createdAt: Date.now(),
      expireAt: new Date().setHours(23, 59, 59, 999),
    };
    wishes.value.unshift(wish);
    persist();
    return wish;
  }

  function updateWishStatus(
    id: string,
    status: WishStatus,
    extra?: { proofImageUrl?: string; proofNote?: string },
  ) {
    const wish = wishes.value.find((w) => w.id === id);
    if (!wish) return;
    wish.status = status;
    if (status === 'done') {
      wish.completedAt = Date.now();
      if (extra?.proofImageUrl) wish.proofImageUrl = extra.proofImageUrl;
      if (extra?.proofNote) wish.proofNote = extra.proofNote;
    }
    persist();
  }

  function removeWish(id: string) {
    wishes.value = wishes.value.filter((w) => w.id !== id);
    persist();
  }

  function getWishById(id: string): Wish | undefined {
    return wishes.value.find((w) => w.id === id);
  }

  // === 持久化 ===
  function persist() {
    storage.set(STORAGE_KEY, wishes.value);
  }

  return {
    wishes,
    statusFilter,
    currentUserId,
    filteredWishes,
    pendingCount,
    activeCount,
    doneCount,
    setCurrentUserId,
    addWish,
    updateWishStatus,
    removeWish,
    getWishById,
  };
});
```

- [ ] **Step 2: TypeScript 检查**

```bash
cd "E:/homework/开发/Claudecode/couple"
npx vue-tsc --noEmit
```

Expected: 零类型错误（当前尚无 Vue 文件引用新方法，不会报错）

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat(wish): rewrite store with mock data, localStorage persistence, and full CRUD"
```

---

### Task 2: WishCard + WishActionSheet 组件

**Files:**
- Create: `src/modules/wish/components/WishCard.vue`
- Create: `src/modules/wish/components/WishActionSheet.vue`

- [ ] **Step 1: 创建 WishCard.vue**

```vue
<script setup lang="ts">
import type { Wish } from '../types';

defineProps<{
  wish: Wish;
  isMine: boolean;
}>();

const emit = defineEmits<{
  click: [wish: Wish];
}>();

const categoryMap: Record<string, string> = {
  food: '🍽️ 吃的',
  chore: '🏠 家务',
  romance: '💕 浪漫',
  company: '👫 陪伴',
  surprise: '🎉 惊喜',
  other: '📦 其他',
};

const statusMap: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '待响应', color: '#FF7A95', bg: '#FFEEF3' },
  accepted: { text: '已接单', color: '#7AE0C4', bg: '#E8FFF5' },
  done: { text: '已完成', color: '#C4B8B8', bg: '#F0E6E6' },
  postponed: { text: '已延期', color: '#FFB84D', bg: '#FFF8EE' },
  ignored: { text: '已忽略', color: '#C4B8B8', bg: '#F0E6E6' },
};

const priorityMap: Record<string, string> = {
  normal: '',
  urgent: '⚡',
  romantic: '💕',
};
</script>

<template>
  <div
    class="wish-card"
    :class="{ 'wish-card--done': wish.status === 'done' }"
    @click="emit('click', wish)"
  >
    <!-- Status badge -->
    <span
      class="wish-card__badge"
      :style="{ color: statusMap[wish.status].color, background: statusMap[wish.status].bg }"
    >
      {{ statusMap[wish.status].text }}
    </span>

    <!-- Category + Priority -->
    <div class="wish-card__header">
      <span class="wish-card__category">
        {{ categoryMap[wish.category] || wish.category }}
      </span>
      <span v-if="priorityMap[wish.priority]" class="wish-card__priority">
        {{ priorityMap[wish.priority] }}
      </span>
    </div>

    <!-- Content -->
    <p class="wish-card__content">{{ wish.content }}</p>

    <!-- Image if exists -->
    <img v-if="wish.imageUrl" :src="wish.imageUrl" class="wish-card__image" alt="" />

    <!-- Proof note -->
    <p v-if="wish.proofNote" class="wish-card__proof">{{ wish.proofNote }}</p>

    <!-- Footer -->
    <div class="wish-card__footer">
      <span class="wish-card__author">
        {{ isMine ? '我' : 'TA' }} · {{ formatTime(wish.createdAt) }}
      </span>
      <span v-if="wish.status === 'done'" class="wish-card__done-stamp">✅</span>
    </div>
  </div>
</template>

<script lang="ts">
function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.wish-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-card);
  position: relative;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
  break-inside: avoid;
  margin-bottom: 12px;
}

.wish-card:active {
  transform: scale(0.97);
}

.wish-card--done {
  background: linear-gradient(135deg, #FFF8F2, #FFEEF3);
  opacity: 0.85;
}

.wish-card__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.wish-card__header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding-right: 48px;
}

.wish-card__category {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium);
}

.wish-card__priority {
  font-size: var(--font-size-xs);
}

.wish-card__content {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: var(--line-height-normal);
  margin-bottom: 8px;
}

.wish-card--done .wish-card__content {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.wish-card__image {
  width: 100%;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.wish-card__proof {
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  background: #E8FFF5;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.wish-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wish-card__author {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}

.wish-card__done-stamp {
  font-size: 18px;
  transform: rotate(15deg);
}
</style>
```

- [ ] **Step 2: 创建 WishActionSheet.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { showToast } from 'vant';
import type { Wish, WishStatus } from '../types';

const props = defineProps<{
  wish: Wish | null;
  visible: boolean;
  isMine: boolean;
}>();

const emit = defineEmits<{
  close: [];
  action: [status: WishStatus, extra?: { proofNote?: string }];
}>();

const actions = computed(() => {
  if (!props.wish) return [];
  const items: { key: WishStatus; icon: string; text: string; desc: string; cls?: string }[] = [];

  if (props.wish.status === 'pending') {
    items.push({ key: 'accepted', icon: '🤗', text: '我来完成', desc: '接单，告诉TA你来做' });
    items.push({ key: 'postponed', icon: '⏰', text: '改天再做', desc: '今天不方便，推到明天' });
  }
  if (props.wish.status === 'pending' || props.wish.status === 'accepted' || props.wish.status === 'postponed') {
    items.push({ key: 'done', icon: '💕', text: '小惊喜！已完成', desc: '直接完成 + 可附一句话证明', cls: 'highlight' });
  }

  return items;
});

function handleAction(key: WishStatus) {
  if (key === 'done' && !props.isMine) {
    // 弹出简单输入框（这里用 prompt 简化，后续可替换为 Vant Dialog）
    const note = prompt('附一句话证明（可选）：');
    emit('action', key, { proofNote: note || undefined });
    return;
  }
  emit('action', key);
}
</script>

<template>
  <van-action-sheet
    :show="visible"
    :actions="[]"
    :title="wish ? `「${wish.content.slice(0, 15)}${wish.content.length > 15 ? '...' : ''}」` : ''"
    @close="emit('close')"
    :close-on-click-action="false"
    cancel-text="取消"
  >
    <div class="action-sheet-content">
      <!-- Wish summary -->
      <div v-if="wish" class="action-summary">
        <p class="action-summary__text">"{{ wish.content }}"</p>
        <span class="action-summary__meta">
          {{ wish.fromUserId === 'user_a' ? '🐰 小兔子' : '🐻 小熊' }}
          · {{ formatTimeBrief(wish.createdAt) }}
        </span>
      </div>

      <!-- Action items -->
      <div class="action-items">
        <div
          v-for="act in actions"
          :key="act.key"
          class="action-item"
          :class="act.cls"
          @click="handleAction(act.key)"
        >
          <span class="action-item__icon">{{ act.icon }}</span>
          <div class="action-item__body">
            <span class="action-item__text">{{ act.text }}</span>
            <span class="action-item__desc">{{ act.desc }}</span>
          </div>
          <span class="action-item__arrow">›</span>
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>

<script lang="ts">
function formatTimeBrief(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}
</script>

<style scoped>
.action-sheet-content {
  padding: 0 0 8px;
}

.action-summary {
  padding: 12px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.action-summary__text {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.action-summary__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
  display: block;
}

.action-items {
  padding: 8px 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.action-item:active {
  background: var(--color-bg);
}

.action-item.highlight {
  background: linear-gradient(135deg, #FFEEF3, #FFF0E8);
}

.action-item__icon {
  font-size: 24px;
}

.action-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.action-item__text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.highlight .action-item__text {
  color: var(--color-primary);
}

.action-item__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.action-item__arrow {
  font-size: 18px;
  color: var(--color-text-hint);
}
</style>
```

- [ ] **Step 3: TypeScript 检查 + 提交**

```bash
cd "E:/homework/开发/Claudecode/couple"
npx vue-tsc --noEmit
git add -A
git commit -m "feat(wish): add WishCard and WishActionSheet components"
```

---

### Task 3: WishHome 卡片墙重写

**Files:**
- Modify: `src/modules/wish/views/WishHome.vue`（完全重写）

- [ ] **Step 1: 重写 WishHome.vue**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWishStore } from '../store';
import { useUserStore } from '@/modules/user/store';
import WishCard from '../components/WishCard.vue';
import WishActionSheet from '../components/WishActionSheet.vue';
import type { Wish, WishStatus } from '../types';

const wishStore = useWishStore();
const userStore = useUserStore();

// 身份同步
wishStore.setCurrentUserId(userStore.currentUserId);

// 筛选标签
const filterTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'pending' as const, label: '待响应' },
  { key: 'active' as const, label: '进行中' },
  { key: 'done' as const, label: '已完成' },
];

function setFilter(key: 'all' | 'pending' | 'active' | 'done') {
  wishStore.statusFilter = key;
}

// Action sheet state
const selectedWish = ref<Wish | null>(null);
const showActionSheet = ref(false);

function onCardClick(wish: Wish) {
  selectedWish.value = wish;
  showActionSheet.value = true;
}

function onActionClose() {
  showActionSheet.value = false;
  selectedWish.value = null;
}

function onAction(status: WishStatus, extra?: { proofNote?: string }) {
  if (!selectedWish.value) return;
  wishStore.updateWishStatus(selectedWish.value.id, status, extra);
  showActionSheet.value = false;
  selectedWish.value = null;
}

// 判断心愿是否是当前用户发的
function isMine(wish: Wish) {
  return wish.fromUserId === userStore.currentUserId;
}

// 下拉刷新
const refreshing = ref(false);
function onRefresh() {
  refreshing.value = true;
  // Mock 刷新：重新计算即可
  setTimeout(() => {
    refreshing.value = false;
  }, 600);
}
</script>

<template>
  <div class="wish-wall">
    <!-- Filter tabs -->
    <div class="filter-tabs">
      <span
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ 'filter-tab--active': wishStore.statusFilter === tab.key }"
        @click="setFilter(tab.key)"
      >
        {{ tab.label }}
        <template v-if="tab.key !== 'all'">
          <sup v-if="tab.key === 'pending' && wishStore.pendingCount" class="filter-count">
            {{ wishStore.pendingCount }}
          </sup>
          <sup v-else-if="tab.key === 'active' && wishStore.activeCount" class="filter-count">
            {{ wishStore.activeCount }}
          </sup>
          <sup v-else-if="tab.key === 'done' && wishStore.doneCount" class="filter-count">
            {{ wishStore.doneCount }}
          </sup>
        </template>
      </span>
    </div>

    <!-- Card grid -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div v-if="wishStore.filteredWishes.length > 0" class="card-grid">
        <WishCard
          v-for="wish in wishStore.filteredWishes"
          :key="wish.id"
          :wish="wish"
          :is-mine="isMine(wish)"
          @click="onCardClick"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty-wrap">
        <EmptyState
          icon="💝"
          title="还没有心愿"
          description="点击右下角按钮，告诉TA你想要什么"
        />
      </div>
    </van-pull-refresh>

    <!-- FAB: create wish -->
    <van-floating-bubble
      icon="plus"
      @click="$router.push('/wish/create')"
    />

    <!-- Action sheet -->
    <WishActionSheet
      :wish="selectedWish"
      :visible="showActionSheet"
      :is-mine="isMine(selectedWish!)"
      @close="onActionClose"
      @action="onAction"
    />
  </div>
</template>

<script lang="ts">
import EmptyState from '@/components/EmptyState.vue';
</script>

<style scoped>
.wish-wall {
  min-height: 100%;
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.filter-tabs {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-base);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.filter-tab--active {
  background: var(--color-primary);
  color: #fff;
  font-weight: var(--font-weight-bold);
}

.filter-count {
  color: inherit;
  margin-left: 2px;
}

.card-grid {
  columns: 2;
  column-gap: 10px;
  padding: 0 var(--space-base);
}

.empty-wrap {
  padding-top: 80px;
}

/* Vant FloatingBubble override */
:deep(.van-floating-bubble) {
  --van-floating-bubble-background: var(--gradient-primary);
  --van-floating-bubble-color: #fff;
}
</style>
```

- [ ] **Step 2: TypeScript 检查 + 提交**

```bash
npx vue-tsc --noEmit
git add -A
git commit -m "feat(wish): rewrite WishHome as filterable card waterfall wall"
```

---

### Task 4: WishCreate 发心愿页 + Routes 更新

**Files:**
- Create: `src/modules/wish/views/WishCreate.vue`
- Modify: `src/modules/wish/routes.ts`

- [ ] **Step 1: 创建 WishCreate.vue**

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useWishStore } from '../store';
import { useUserStore } from '@/modules/user/store';
import type { WishCategory, WishPriority } from '../types';

const router = useRouter();
const wishStore = useWishStore();
const userStore = useUserStore();

const content = ref('');
const category = ref<WishCategory>('food');
const priority = ref<WishPriority>('normal');
const anonymous = ref(false);

const categories: { key: WishCategory; label: string }[] = [
  { key: 'food', label: '🍽️ 吃的' },
  { key: 'chore', label: '🏠 家务' },
  { key: 'romance', label: '💕 浪漫' },
  { key: 'company', label: '👫 陪伴' },
  { key: 'surprise', label: '🎉 惊喜' },
  { key: 'other', label: '📦 其他' },
];

const priorities: { key: WishPriority; label: string }[] = [
  { key: 'normal', label: '普通' },
  { key: 'urgent', label: '⚡ 小急' },
  { key: 'romantic', label: '💕 小浪漫' },
];

// 模板
const templates = [
  '帮我带一杯奶茶',
  '今晚一起看电影',
  '帮我按摩五分钟',
  '今天早点睡',
  '给我唱首歌',
  '周末一起出去玩',
  '帮我做顿饭',
  '陪我去散步',
];

function useTemplate(text: string) {
  content.value = text;
}

const submitting = ref(false);

function onSubmit() {
  if (!content.value.trim()) {
    showToast('请输入心愿内容');
    return;
  }
  if (!userStore.partner) {
    showToast('请先绑定另一半');
    return;
  }

  submitting.value = true;
  wishStore.addWish({
    fromUserId: userStore.currentUserId,
    toUserId: userStore.partner.id,
    content: content.value.trim(),
    category: category.value,
    priority: priority.value,
    anonymous: anonymous.value,
  });

  showToast({ message: '心愿已发送 ✨', icon: 'success', duration: 1500 });
  setTimeout(() => {
    router.replace('/wish');
  }, 800);
}
</script>

<template>
  <div class="wish-create">
    <!-- Content input -->
    <div class="form-group">
      <label class="form-label">告诉TA你想要什么</label>
      <textarea
        v-model="content"
        class="form-textarea"
        placeholder="比如：想吃你做的番茄炒蛋 🍳"
        maxlength="50"
        rows="3"
      />
      <span class="form-counter" :class="{ 'form-counter--warn': content.length >= 45 }">
        {{ content.length }}/50
      </span>
    </div>

    <!-- Category -->
    <div class="form-group">
      <label class="form-label">分类</label>
      <div class="chip-group">
        <span
          v-for="cat in categories"
          :key="cat.key"
          class="chip"
          :class="{ 'chip--active': category === cat.key }"
          @click="category = cat.key"
        >
          {{ cat.label }}
        </span>
      </div>
    </div>

    <!-- Priority -->
    <div class="form-group">
      <label class="form-label">优先级</label>
      <div class="chip-group">
        <span
          v-for="p in priorities"
          :key="p.key"
          class="chip"
          :class="{ 'chip--active': priority === p.key }"
          @click="priority = p.key"
        >
          {{ p.label }}
        </span>
      </div>
    </div>

    <!-- Anonymous toggle -->
    <div class="form-group form-toggle">
      <div>
        <span class="form-toggle__title">匿名发送</span>
        <span class="form-toggle__desc">TA不知道是谁发的</span>
      </div>
      <van-switch v-model="anonymous" size="22px" />
    </div>

    <!-- Templates -->
    <div class="form-group">
      <label class="form-label">💡 快速模板（点击填入）</label>
      <div class="template-grid">
        <span
          v-for="tpl in templates"
          :key="tpl"
          class="template-chip"
          @click="useTemplate(tpl)"
        >
          {{ tpl }}
        </span>
      </div>
    </div>

    <!-- Submit -->
    <van-button
      type="primary"
      round
      block
      :loading="submitting"
      loading-text="发送中..."
      @click="onSubmit"
    >
      发送心愿 ✨
    </van-button>
  </div>
</template>

<style scoped>
.wish-create {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 32px);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.form-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  resize: none;
  font-family: inherit;
}

.form-textarea:focus {
  border-color: var(--color-primary);
}

.form-counter {
  display: block;
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
}

.form-counter--warn {
  color: var(--color-danger);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.chip--active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.form-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.form-toggle__title {
  display: block;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.form-toggle__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-chip {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-primary-light);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.template-chip:active {
  background: var(--color-primary);
  color: #fff;
}
</style>
```

- [ ] **Step 2: 更新 wish routes.ts**

将原来的单路由改成包含 `/wish/create` 的双路由：

```ts
import type { RouteRecordRaw } from 'vue-router';

export const wishRoutes: RouteRecordRaw[] = [
  {
    path: '/wish',
    name: 'wish',
    component: () => import('./views/WishHome.vue'),
    meta: { title: '心愿墙', module: 'wish' },
  },
  {
    path: '/wish/create',
    name: 'wishCreate',
    component: () => import('./views/WishCreate.vue'),
    meta: { title: '发心愿', module: 'wish', showBack: true },
  },
];
```

- [ ] **Step 3: TypeScript 检查 + 提交**

```bash
npx vue-tsc --noEmit
git add -A
git commit -m "feat(wish): add WishCreate page with templates, and update routes"
```

---

### Task 5: User Store 增强 + IdentitySwitcher + UserHome 重写

**Files:**
- Modify: `src/modules/user/store.ts`
- Create: `src/modules/user/components/IdentitySwitcher.vue`
- Modify: `src/modules/user/views/UserHome.vue`

- [ ] **Step 1: 增强 user store**

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from './types';
import { storage } from '@/core/storage';

// === Mock 用户 ===
const MOCK_USERS: Record<string, User> = {
  user_a: {
    id: 'user_a',
    nickname: '小兔子',
    avatar: '🐰',
    partnerId: 'user_b',
    coupleCode: 'SWEET99',
    createdAt: Date.now(),
  },
  user_b: {
    id: 'user_b',
    nickname: '小熊',
    avatar: '🐻',
    partnerId: 'user_a',
    coupleCode: 'SWEET99',
    createdAt: Date.now(),
  },
};

export const useUserStore = defineStore('user', () => {
  // 初始化：从 localStorage 读取当前身份，默认 user_a
  const savedId = storage.get<string>('currentUserId', 'user_a');
  const currentUser = ref<User>(MOCK_USERS[savedId || 'user_a']);

  // 另一半
  const partner = computed<User | null>(() => {
    const pid = currentUser.value.partnerId;
    return pid ? MOCK_USERS[pid] : null;
  });

  const currentUserId = computed(() => currentUser.value.id);

  const isBound = computed(() => !!currentUser.value.partnerId);
  const coupleCode = computed(() => currentUser.value.coupleCode ?? '');

  // === 身份切换 ===
  function switchTo(userId: string) {
    if (MOCK_USERS[userId]) {
      currentUser.value = MOCK_USERS[userId];
      storage.set('currentUserId', userId);
      // 触发全局刷新（其他 store 通过 watch 响应）
      window.dispatchEvent(new CustomEvent('identity-changed', { detail: { userId } }));
    }
  }

  function getAllUsers(): User[] {
    return Object.values(MOCK_USERS);
  }

  // === 情侣绑定（占位，阶段 2 不实现真实逻辑） ===
  function bindCouple(code: string) {
    if (currentUser.value) {
      currentUser.value.coupleCode = code;
    }
  }

  function unbindCouple() {
    if (currentUser.value) {
      currentUser.value.partnerId = undefined;
      currentUser.value.coupleCode = undefined;
    }
  }

  return {
    currentUser,
    partner,
    currentUserId,
    isBound,
    coupleCode,
    switchTo,
    getAllUsers,
    bindCouple,
    unbindCouple,
  };
});
```

- [ ] **Step 2: 创建 IdentitySwitcher.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../store';
import type { User } from '../types';

const userStore = useUserStore();
const visible = ref(false);

function onSwitch(user: User) {
  userStore.switchTo(user.id);
  visible.value = false;
}
</script>

<template>
  <!-- Trigger: current identity badge -->
  <div class="identity-badge" @click="visible = true">
    <span class="identity-badge__avatar">{{ userStore.currentUser.avatar }}</span>
    <span class="identity-badge__name">{{ userStore.currentUser.nickname }}</span>
    <span class="identity-badge__arrow">▾</span>
  </div>

  <!-- Switcher popup -->
  <van-popup v-model:show="visible" position="bottom" round :safe-area-inset-bottom="true">
    <div class="switcher-panel">
      <h3 class="switcher-title">切换身份</h3>
      <div
        v-for="user in userStore.getAllUsers()"
        :key="user.id"
        class="switcher-item"
        :class="{ 'switcher-item--active': user.id === userStore.currentUserId }"
        @click="onSwitch(user)"
      >
        <span class="switcher-item__avatar">{{ user.avatar }}</span>
        <div class="switcher-item__body">
          <span class="switcher-item__name">
            {{ user.nickname }}
            <template v-if="user.id === userStore.currentUserId">（当前）</template>
          </span>
          <span class="switcher-item__relation">
            {{ user.id === userStore.currentUserId ? '当前身份' : '你的另一半 💕' }}
          </span>
        </div>
        <span v-if="user.id === userStore.currentUserId" class="switcher-item__check">✓</span>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.identity-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

.identity-badge__avatar {
  font-size: 20px;
}

.identity-badge__name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.identity-badge__arrow {
  font-size: 10px;
  color: var(--color-text-hint);
}

.switcher-panel {
  padding: 8px 0 16px;
}

.switcher-title {
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.switcher-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.switcher-item:active {
  background: var(--color-bg);
}

.switcher-item--active {
  background: var(--color-primary-light);
}

.switcher-item__avatar {
  font-size: 32px;
}

.switcher-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.switcher-item__name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.switcher-item__relation {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.switcher-item__check {
  font-size: 16px;
  color: var(--color-primary);
}
</style>
```

- [ ] **Step 3: 重写 UserHome.vue**

```vue
<script setup lang="ts">
import { useUserStore } from '../store';
import IdentitySwitcher from '../components/IdentitySwitcher.vue';

const userStore = useUserStore();
</script>

<template>
  <div class="user-page">
    <!-- Profile card -->
    <div class="profile-card">
      <div class="profile-avatar">{{ userStore.currentUser.avatar }}</div>
      <h2 class="profile-name">{{ userStore.currentUser.nickname }}</h2>
      <p class="profile-code" v-if="userStore.coupleCode">
        情侣码：<strong>{{ userStore.coupleCode }}</strong>
      </p>
    </div>

    <!-- Partner info -->
    <div class="partner-card" v-if="userStore.partner">
      <span class="partner-label">你的另一半</span>
      <div class="partner-info">
        <span class="partner-avatar">{{ userStore.partner.avatar }}</span>
        <span class="partner-name">{{ userStore.partner.nickname }}</span>
      </div>
    </div>
    <div v-else class="partner-card partner-card--empty">
      <p>还没有绑定另一半</p>
      <van-button type="primary" round size="small">绑定另一半 💕</van-button>
    </div>

    <!-- Menu items -->
    <div class="menu-list">
      <van-cell title="🧑‍🤝‍🧑 切换身份" is-link @click="/* IdentitySwitcher trigger via badge in AppShell */" />
      <van-cell title="🔔 通知设置" is-link />
      <van-cell title="🎨 主题切换" is-link />
      <van-cell title="📋 关于小甜豆" is-link />
    </div>
  </div>
</template>

<style scoped>
.user-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.profile-card {
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  background: var(--gradient-card);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-base);
}

.profile-avatar {
  font-size: 64px;
  margin-bottom: var(--space-sm);
}

.profile-name {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.profile-code {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.partner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-base);
  box-shadow: var(--shadow-card);
}

.partner-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.partner-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.partner-avatar {
  font-size: 32px;
}

.partner-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.partner-card--empty {
  flex-direction: column;
  gap: 12px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  padding: var(--space-xl);
}

.menu-list {
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
```

- [ ] **Step 4: TypeScript 检查 + 提交**

```bash
npx vue-tsc --noEmit
git add -A
git commit -m "feat(user): add identity switcher, mock users, and user profile page"
```

---

### Task 6: Notify Store 增强 + NotifyCenter 页面

**Files:**
- Modify: `src/modules/notify/store.ts`
- Create: `src/modules/notify/views/NotifyCenter.vue`

- [ ] **Step 1: 增强 notify store**

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppNotification, NotificationType } from './types';
import { storage } from '@/core/storage';

const STORAGE_KEY = 'notifications';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30天

let nextId = 1;

export const useNotifyStore = defineStore('notify', () => {
  const stored = storage.get<AppNotification[]>(STORAGE_KEY);
  const notifications = ref<AppNotification[]>(stored || []);
  const pushEnabled = ref(false);

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.read).length,
  );

  function addNotification(type: NotificationType, title: string, body: string, relatedId?: string) {
    const n: AppNotification = {
      id: `notif_${nextId++}_${Date.now()}`,
      type,
      title,
      body,
      read: false,
      createdAt: Date.now(),
      relatedId,
    };
    notifications.value.unshift(n);
    persist();
    tryPush(n);
  }

  function markAsRead(id: string) {
    const n = notifications.value.find((n) => n.id === id);
    if (n) { n.read = true; }
    persist();
  }

  function markAllRead() {
    notifications.value.forEach((n) => { n.read = true; });
    persist();
  }

  function clearAll() {
    notifications.value = [];
    persist();
  }

  // === 浏览器推送 ===
  function requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notify] Browser does not support Notification API');
      return;
    }
    if (Notification.permission === 'granted') {
      pushEnabled.value = true;
      return;
    }
    Notification.requestPermission().then((perm) => {
      pushEnabled.value = perm === 'granted';
    });
  }

  function tryPush(n: AppNotification) {
    if (pushEnabled.value && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(n.title, { body: n.body, icon: '/assets/app-icon.svg' });
      } catch {
        // 静默降级
      }
    }
  }

  // === 清理过期通知 ===
  function cleanup() {
    const cutoff = Date.now() - MAX_AGE_MS;
    notifications.value = notifications.value.filter((n) => n.createdAt > cutoff);
    persist();
  }

  // === 持久化 ===
  function persist() {
    storage.set(STORAGE_KEY, notifications.value);
  }

  // 初始化清理
  cleanup();

  return {
    notifications,
    pushEnabled,
    unreadCount,
    addNotification,
    markAsRead,
    markAllRead,
    clearAll,
    requestPushPermission,
  };
});
```

- [ ] **Step 2: 创建 NotifyCenter.vue**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifyStore } from '../store';
import { useWishStore } from '@/modules/wish/store';

const notifyStore = useNotifyStore();
const router = useRouter();

onMounted(() => {
  notifyStore.requestPushPermission();
});

const typeMap: Record<string, { icon: string; color: string }> = {
  wish_new: { icon: '📝', color: '#FF7A95' },
  wish_accepted: { icon: '🤗', color: '#7AE0C4' },
  wish_done: { icon: '💕', color: '#FFB84D' },
  checkin_remind: { icon: '🔔', color: '#A89A9A' },
  anniversary: { icon: '🎂', color: '#FF7A95' },
};

function onNotifyClick(notif: { id: string; relatedId?: string; read: boolean }) {
  notifyStore.markAsRead(notif.id);
  if (notif.relatedId) {
    router.push('/wish');
  }
}
</script>

<template>
  <div class="notify-page">
    <div class="notify-header">
      <span class="notify-header__title">🔔 通知</span>
      <span
        v-if="notifyStore.unreadCount > 0"
        class="mark-all-read"
        @click="notifyStore.markAllRead"
      >
        全部已读
      </span>
    </div>

    <div v-if="notifyStore.notifications.length === 0" class="empty-wrap">
      <EmptyState
        icon="🔕"
        title="暂无通知"
        description="当心愿状态变化时，通知会出现在这里"
      />
    </div>

    <div v-else class="notify-list">
      <div
        v-for="notif in notifyStore.notifications"
        :key="notif.id"
        class="notify-item"
        :class="{ 'notify-item--unread': !notif.read }"
        :style="{ borderLeftColor: typeMap[notif.type]?.color || '#F0E6E6' }"
        @click="onNotifyClick(notif)"
      >
        <span class="notify-item__icon">{{ typeMap[notif.type]?.icon || '📌' }}</span>
        <div class="notify-item__body">
          <div class="notify-item__header">
            <span class="notify-item__title">{{ notif.title }}</span>
            <span v-if="!notif.read" class="notify-item__dot" />
          </div>
          <p class="notify-item__body-text">{{ notif.body }}</p>
          <span class="notify-item__time">{{ formatTime(notif.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import EmptyState from '@/components/EmptyState.vue';

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}
</script>

<style scoped>
.notify-page {
  min-height: 100%;
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.notify-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-base);
  border-bottom: 1px solid var(--color-border);
}

.notify-header__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.mark-all-read {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.notify-list {
  padding: var(--space-sm);
}

.notify-item {
  display: flex;
  gap: 12px;
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border-left: 3px solid var(--color-border);
  cursor: pointer;
  transition: background var(--duration-fast);
}

.notify-item:active {
  background: var(--color-bg);
}

.notify-item--unread {
  background: var(--color-primary-light);
}

.notify-item__icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notify-item__body {
  flex: 1;
  min-width: 0;
}

.notify-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.notify-item__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.notify-item__dot {
  width: 6px;
  height: 6px;
  background: var(--color-danger);
  border-radius: 50%;
  flex-shrink: 0;
}

.notify-item__body-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-item__time {
  font-size: 10px;
  color: var(--color-text-hint);
}

.empty-wrap {
  padding-top: 80px;
}
</style>
```

- [ ] **Step 3: TypeScript 检查 + 提交**

```bash
npx vue-tsc --noEmit
git add -A
git commit -m "feat(notify): enhance store with browser push and add NotifyCenter page"
```

---

### Task 7: AppShell 通知铃铛 + Router 新增路由

**Files:**
- Modify: `src/core/layout/AppShell.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: AppShell 加通知铃铛**

在 AppShell.vue 的 `<script setup>` 中添加：

```ts
import { useNotifyStore } from '@/modules/notify/store';
import { useRouter } from 'vue-router';

const router = useRouter();
const notifyStore = useNotifyStore();
```

在 `<template>` 的 `</van-nav-bar>` 之前添加 `#right` 插槽：

```html
<template #right>
  <div class="notify-bell" @click="router.push('/notify')">
    <van-icon name="bell-o" size="20" />
    <span v-if="notifyStore.unreadCount > 0" class="notify-bell__badge">
      {{ notifyStore.unreadCount > 99 ? '99+' : notifyStore.unreadCount }}
    </span>
  </div>
</template>
```

在 `<style scoped>` 中添加：

```css
.notify-bell {
  position: relative;
  cursor: pointer;
  padding: 4px;
}

.notify-bell__badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  padding: 0 4px;
}
```

- [ ] **Step 2: Router 新增路由**

在 `src/router.ts` 中添加（放在 settingsRoute 之前）：

```ts
// Notification center page
const notifyRoute: RouteRecordRaw = {
  path: '/notify',
  name: 'notifyCenter',
  component: () => import('@/modules/notify/views/NotifyCenter.vue'),
  meta: { title: '通知', showBack: true },
};
```

并更新 routes 数组：

```ts
routes: [rootRoute, ...getAllRoutes(), notifyRoute, settingsRoute, notFoundRoute],
```

- [ ] **Step 3: TypeScript 检查 + 构建验证 + 提交**

```bash
npx vue-tsc --noEmit
npx vite build
git add -A
git commit -m "feat: add notification bell to AppShell and wire up new routes"
```

---

### Task 8: Wish Store 通知联动 + 最终验证

**Files:**
- Modify: `src/modules/wish/store.ts`（在 updateWishStatus 中触发通知）

- [ ] **Step 1: 在 wish store 中集成通知**

在 `updateWishStatus` 函数末尾，persist() 之后添加：

```ts
// 动态导入避免循环依赖
import('@/modules/notify/store').then(({ useNotifyStore }) => {
  const notify = useNotifyStore();
  const fromUser = wish!.fromUserId === 'user_a' ? '小兔子' : '小熊';
  const toUser = wish!.toUserId === 'user_a' ? '小兔子' : '小熊';

  if (status === 'accepted') {
    notify.addNotification('wish_accepted', `${fromUser}接单了你的心愿`, `「${wish!.content}」— ${fromUser}说交给我吧！`, wish!.id);
  } else if (status === 'done') {
    notify.addNotification('wish_done', '心愿已完成！', `「${wish!.content}」— 已完成${wish!.proofNote ? '：' + wish!.proofNote : ''}`, wish!.id);
  }
});
```

- [ ] **Step 2: 通知也响应用户切换**

在 wish store 中添加 userId watch：

```ts
// 监听身份切换事件
import { onMounted, onUnmounted } from 'vue';

// store setup 内部：
function onIdentityChanged(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (detail?.userId) {
    setCurrentUserId(detail.userId);
  }
}

// 注意：Pinia setup store 不能在内部用 onMounted/onUnmounted
// 改为在组件中使用 watch
```

改为在 WishHome.vue 中监听身份切换：

```ts
// WishHome.vue <script setup> 中添加：
import { onMounted, onUnmounted } from 'vue';

function onIdentityChanged(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (detail?.userId) {
    wishStore.setCurrentUserId(detail.userId);
  }
}

onMounted(() => {
  window.addEventListener('identity-changed', onIdentityChanged);
});

onUnmounted(() => {
  window.removeEventListener('identity-changed', onIdentityChanged);
});
```

- [ ] **Step 3: 最终构建验证 + 提交**

```bash
npx vue-tsc --noEmit
npx vite build
git add -A
git commit -m "feat(wish): integrate notifications on wish status changes"
```

Expected: zero TS errors, build成功，JS包 < 150KB (gzip < 55KB)。

---

## 完成标准检查清单

- [ ] `npm run dev` 正常启动
- [ ] 卡片墙展示 5 条 Mock 心愿，双列瀑布流
- [ ] 筛选标签（全部/待响应/进行中/已完成）正常工作
- [ ] 点「+」进发心愿页，表单完整可用，提交后自动返回卡片墙
- [ ] 点身份切换器 → 切换小兔子/小熊 → 卡片墙自动刷新
- [ ] 点卡片 → 弹出操作面板 → 接单/完成流程通畅
- [ ] NavBar 铃铛显示未读数 → 点击进通知中心
- [ ] 接单/完成操作后自动生成通知
- [ ] `vue-tsc --noEmit` 零类型错误
- [ ] `vite build` 成功

---

**计划结束。按子代理驱动方式执行，每任务独立派发。**