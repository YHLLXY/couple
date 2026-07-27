# 阶段 4b：共同日记 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增共同日记模块——情侣共享一本日记，文字+Emoji，支持私密标记，日历联动。

**Architecture:** 遵循现有插件化架构，新建 `src/modules/diary/` 模块（types → store → routes → views → components），修改 calendar 模块（types + store + CalendarHome）实现日历联动，修改 UserHome 加入口。

**Tech Stack:** Vue 3.4+ (Composition API + `<script setup>`), Pinia, Vant 4, TypeScript, localStorage

---

### Task 1: 数据层 — types.ts + store.ts

**Files:**
- Create: `src/modules/diary/types.ts`
- Create: `src/modules/diary/store.ts`

- [ ] **Step 1: 写 types.ts**

```typescript
// src/modules/diary/types.ts

export interface DiaryEntry {
  id: string;
  content: string;           // 文字内容（含 emoji Unicode）
  images: string[];          // 预留：图片 base64，暂不使用
  authorId: string;          // 'user_a' | 'user_b'
  isPrivate: boolean;        // 🔒 私密，仅作者可见
  createdAt: number;         // 时间戳
  updatedAt?: number;
}
```

- [ ] **Step 2: 写 store.ts**

```typescript
// src/modules/diary/store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DiaryEntry } from './types';
import { storage } from '@/core/storage';

const STORAGE_KEY = 'diary_entries';

// 种子数据
function seedEntries(): DiaryEntry[] {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: 'd1',
      content: '今天是我们在一起的第 100 天！一起去吃了火锅，然后看了电影。好幸福的一天 💕',
      images: [],
      authorId: 'user_a',
      isPrivate: false,
      createdAt: now - day * 2,
    },
    {
      id: 'd2',
      content: '给 TA 做了番茄炒蛋，虽然有点咸但 TA 说很好吃 🥹',
      images: [],
      authorId: 'user_b',
      isPrivate: false,
      createdAt: now - day * 2 + 3600000,
    },
    {
      id: 'd3',
      content: '今天工作好累，但回家看到 TA 的消息就感觉好多了 🌙',
      images: [],
      authorId: 'user_a',
      isPrivate: false,
      createdAt: now - day * 5,
    },
    {
      id: 'd4',
      content: '偷偷写一条私密日记，只有我自己能看到 🤫',
      images: [],
      authorId: 'user_a',
      isPrivate: true,
      createdAt: now - day,
    },
  ];
}

function genId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDiaryStore = defineStore('diary', () => {
  // === 状态 ===
  const entries = ref<DiaryEntry[]>(
    storage.get<DiaryEntry[]>(STORAGE_KEY) ?? seedEntries()
  );

  // === 当前用户 ===
  function currentUserId(): string {
    return storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
  }

  // === 计算属性 ===

  /** 当前用户可见的条目（过滤掉他人的私密） */
  const visibleEntries = computed(() =>
    entries.value
      .filter(e => !e.isPrivate || e.authorId === currentUserId())
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  /** 按日期分组 */
  const entriesByDate = computed(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of visibleEntries.value) {
      const date = new Date(e.createdAt).toISOString().slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(e);
      map.set(date, list);
    }
    return map;
  });

  /** 有日记的日期集合（供日历消费） */
  const diaryDates = computed(() => {
    const dates = new Set<string>();
    for (const e of entries.value) {
      if (!e.isPrivate || e.authorId === currentUserId()) {
        dates.add(new Date(e.createdAt).toISOString().slice(0, 10));
      }
    }
    return dates;
  });

  // === 持久化 ===
  function save() {
    storage.set(STORAGE_KEY, entries.value);
  }

  // === 操作 ===

  function addEntry(content: string, dateStr: string, isPrivate: boolean): DiaryEntry {
    const [y, m, d] = dateStr.split('-').map(Number);
    const createdAt = new Date(y, m - 1, d, 12, 0, 0).getTime();
    const entry: DiaryEntry = {
      id: genId(),
      content,
      images: [],
      authorId: currentUserId(),
      isPrivate,
      createdAt,
    };
    entries.value.push(entry);
    save();
    return entry;
  }

  function updateEntry(id: string, content: string, isPrivate: boolean, dateStr?: string): boolean {
    const entry = entries.value.find(e => e.id === id);
    if (!entry || entry.authorId !== currentUserId()) return false;
    entry.content = content;
    entry.isPrivate = isPrivate;
    entry.updatedAt = Date.now();
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      entry.createdAt = new Date(y, m - 1, d, 12, 0, 0).getTime();
    }
    save();
    return true;
  }

  function deleteEntry(id: string): boolean {
    const entry = entries.value.find(e => e.id === id);
    if (!entry || entry.authorId !== currentUserId()) return false;
    entries.value = entries.value.filter(e => e.id !== id);
    save();
    return true;
  }

  function getEntryById(id: string): DiaryEntry | undefined {
    return entries.value.find(e => e.id === id);
  }

  return {
    entries, visibleEntries, entriesByDate, diaryDates,
    currentUserId,
    addEntry, updateEntry, deleteEntry, getEntryById,
  };
});
```

- [ ] **Step 3: 验证构建**

```bash
cd "E:/homework/开发/Claudecode/couple" && npx vue-tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: No new type errors from `src/modules/diary/`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/diary/types.ts src/modules/diary/store.ts
git commit -m "feat(diary): add types and store with seed data"
```

---

### Task 2: 模块注册 — routes.ts + index.ts

**Files:**
- Create: `src/modules/diary/routes.ts`
- Create: `src/modules/diary/index.ts`

- [ ] **Step 1: 写 routes.ts**

```typescript
// src/modules/diary/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const diaryRoutes: RouteRecordRaw[] = [
  {
    path: '/diary',
    name: 'diary',
    component: () => import('./views/DiaryHome.vue'),
    meta: { title: '共同日记', showBack: true },
  },
  {
    path: '/diary/write',
    name: 'diaryWrite',
    component: () => import('./views/DiaryWrite.vue'),
    meta: { title: '写日记', showBack: true },
  },
];
```

- [ ] **Step 2: 写 index.ts**

```typescript
// src/modules/diary/index.ts
import { registerModule } from '@/core/registry';
import { diaryRoutes } from './routes';

registerModule({
  id: 'diary',
  name: '日记',
  routes: diaryRoutes,
  tabBar: false,
  enabled: true,
});
```

- [ ] **Step 3: 在 main.ts 中注册 diary 模块**

在 `src/main.ts` 的模块 import 列表末尾加入：

```typescript
import './modules/diary';
```

完整列表变为：

```typescript
import './modules/theme';
import './modules/notify';
import './modules/interact';
import './modules/wish';
import './modules/calendar';
import './modules/user';
import './modules/points';
import './modules/diary';     // ← 新增
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/diary/routes.ts src/modules/diary/index.ts src/main.ts
git commit -m "feat(diary): add routes and module registration"
```

---

### Task 3: DiaryCard 组件

**Files:**
- Create: `src/modules/diary/components/DiaryCard.vue`

- [ ] **Step 1: 写 DiaryCard.vue**

```vue
<!-- src/modules/diary/components/DiaryCard.vue -->
<script setup lang="ts">
import type { DiaryEntry } from '../types';

const props = defineProps<{
  entry: DiaryEntry;
}>();

const emit = defineEmits<{
  (e: 'click', entry: DiaryEntry): void;
}>();

function getAuthorName(userId: string): string {
  return userId === 'user_a' ? '小兔子' : '小熊';
}

function getAuthorAvatar(userId: string): string {
  return userId === 'user_a' ? '🐰' : '🐻';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<template>
  <div class="diary-card" @click="emit('click', entry)">
    <div class="diary-card__header">
      <div class="diary-card__author">
        <span class="diary-card__avatar">{{ getAuthorAvatar(entry.authorId) }}</span>
        <span class="diary-card__name">{{ getAuthorName(entry.authorId) }}</span>
      </div>
      <span v-if="entry.isPrivate" class="diary-card__private">🔒</span>
    </div>
    <p class="diary-card__content">{{ entry.content }}</p>
    <span class="diary-card__time">{{ formatTime(entry.createdAt) }}</span>
  </div>
</template>

<style scoped>
.diary-card {
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.diary-card:active {
  background: var(--color-primary-light);
}

.diary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.diary-card__author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.diary-card__avatar {
  font-size: 24px;
}

.diary-card__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.diary-card__private {
  font-size: 14px;
}

.diary-card__content {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
  white-space: pre-wrap;
}

.diary-card__time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/diary/components/DiaryCard.vue
git commit -m "feat(diary): add DiaryCard component"
```

---

### Task 4: DiaryHome 时间线列表页

**Files:**
- Create: `src/modules/diary/views/DiaryHome.vue`

- [ ] **Step 1: 写 DiaryHome.vue**

```vue
<!-- src/modules/diary/views/DiaryHome.vue -->
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDiaryStore } from '../store';
import DiaryCard from '../components/DiaryCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DiaryEntry } from '../types';

const route = useRoute();
const router = useRouter();
const store = useDiaryStore();

// 按日期倒序分组
const dateGroups = computed(() => {
  const groups: { date: string; label: string; entries: DiaryEntry[] }[] = [];
  for (const [date, entries] of store.entriesByDate) {
    const d = new Date(date);
    groups.push({
      date,
      label: `${d.getMonth() + 1}月${d.getDate()}日`,
      entries,
    });
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
});

// 从日历跳转的 ?date= 参数
const highlightDate = ref(route.query.date as string | undefined);

function onCardClick(entry: DiaryEntry) {
  router.push({ path: '/diary/write', query: { id: entry.id } });
}

function goWrite() {
  router.push('/diary/write');
}

// 从日历跳过来时滚动到对应日期
const dateSectionRefs = ref<Record<string, HTMLElement | null>>({});

watch(dateGroups, () => {
  if (highlightDate.value) {
    nextTick(() => {
      const el = dateSectionRefs.value[highlightDate.value!];
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightDate.value = undefined;
    });
  }
});
</script>

<template>
  <div class="diary-home">
    <!-- 顶部 -->
    <div class="diary-home__header">
      <h2>📔 共同日记</h2>
      <van-button type="primary" size="small" round @click="goWrite">
        ✏️ 写日记
      </van-button>
    </div>

    <!-- 空状态 -->
    <EmptyState
      v-if="dateGroups.length === 0"
      message="还没有写过日记"
      action-text="写第一篇日记"
      @action="goWrite"
    />

    <!-- 时间线 -->
    <div v-else class="timeline">
      <div
        v-for="group in dateGroups"
        :key="group.date"
        :ref="el => dateSectionRefs[group.date] = el as HTMLElement | null"
        class="timeline-section"
      >
        <div class="timeline-date">
          <span class="timeline-date__dot"></span>
          {{ group.label }}
        </div>
        <DiaryCard
          v-for="entry in group.entries"
          :key="entry.id"
          :entry="entry"
          @click="onCardClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-home {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.diary-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.diary-home__header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.timeline {
  position: relative;
}

.timeline-section {
  margin-bottom: var(--space-base);
}

.timeline-date {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-date__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: 验证 EmptyState 组件是否支持 action 插槽/slot**

Read `src/components/EmptyState.vue` to check. If not, use a simpler inline empty state:

```html
<div v-if="dateGroups.length === 0" class="empty-hint">
  <p>还没有写过日记</p>
  <van-button type="primary" size="small" round @click="goWrite">写第一篇日记</van-button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/diary/views/DiaryHome.vue
git commit -m "feat(diary): add DiaryHome timeline view"
```

---

### Task 5: DiaryWrite 写日记页

**Files:**
- Create: `src/modules/diary/views/DiaryWrite.vue`

- [ ] **Step 1: 写 DiaryWrite.vue**

```vue
<!-- src/modules/diary/views/DiaryWrite.vue -->
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { useDiaryStore } from '../store';

const route = useRoute();
const router = useRouter();
const store = useDiaryStore();

const isEdit = computed(() => !!route.query.id);

const dateStr = ref('');
const content = ref('');
const isPrivate = ref(false);
const showDatePicker = ref(false);

// 常用 emoji
const emojis = ['😊','😂','❤️','😍','🎉','💕','🥹','😢','😡','👍','🔥','⭐',
  '🌈','🌸','🍀','🎂','🍕','🎮','💪','🤗','😴','💤','🌙','☀️',
  '🌧️','❄️','🎵','📖','✈️','🏠','🐱','🐶','🌻','💐','🍰','☕'];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 初始化
if (isEdit.value) {
  const entry = store.getEntryById(route.query.id as string);
  if (entry && entry.authorId === store.currentUserId()) {
    dateStr.value = formatDate(new Date(entry.createdAt));
    content.value = entry.content;
    isPrivate.value = entry.isPrivate;
  } else {
    showToast('无法编辑这条日记');
    router.back();
  }
} else {
  dateStr.value = (route.query.date as string) || formatDate(new Date());
}

function insertEmoji(emoji: string) {
  const textarea = document.querySelector('.diary-write__textarea') as HTMLTextAreaElement;
  if (!textarea) {
    content.value += emoji;
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  content.value = content.value.slice(0, start) + emoji + content.value.slice(end);
  nextTick(() => {
    textarea.focus();
    const pos = start + emoji.length;
    textarea.setSelectionRange(pos, pos);
  });
}

async function handleSave() {
  if (!content.value.trim()) {
    showToast('写点什么吧');
    return;
  }

  if (isEdit.value) {
    store.updateEntry(route.query.id as string, content.value.trim(), isPrivate.value, dateStr.value);
    showToast('已更新');
  } else {
    store.addEntry(content.value.trim(), dateStr.value, isPrivate.value);
    showToast('已保存');
  }
  router.back();
}

function handleDelete() {
  if (!isEdit.value) return;
  showDialog({
    title: '删除日记',
    message: '删除后无法恢复',
  }).then(() => {
    store.deleteEntry(route.query.id as string);
    showToast('已删除');
    router.back();
  }).catch(() => {});
}

function onDateConfirm(value: Date[]) {
  dateStr.value = formatDate(value[0]);
  showDatePicker.value = false;
}

function dateLabel(): string {
  const d = new Date(dateStr.value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
</script>

<template>
  <div class="diary-write">
    <!-- 日期选择 -->
    <div class="diary-write__date" @click="showDatePicker = true">
      <span>📅 {{ dateLabel() }}</span>
      <van-icon name="arrow-down" size="14" />
    </div>
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        :model-value="[dateStr]"
        title="选择日期"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 编辑区 -->
    <textarea
      class="diary-write__textarea"
      v-model="content"
      placeholder="今天发生了什么有趣的事..."
      rows="8"
    ></textarea>

    <!-- Emoji 面板 -->
    <div class="emoji-panel">
      <div class="emoji-panel__label">😊 表情</div>
      <div class="emoji-panel__grid">
        <span
          v-for="emoji in emojis"
          :key="emoji"
          class="emoji-panel__item"
          @click="insertEmoji(emoji)"
        >{{ emoji }}</span>
      </div>
    </div>

    <!-- 私密开关 -->
    <div class="diary-write__options">
      <div class="option-row">
        <span>🔒 标记为私密（仅自己可见）</span>
        <van-switch v-model="isPrivate" size="22px" />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="diary-write__actions">
      <van-button type="primary" round block @click="handleSave">
        {{ isEdit ? '保存修改' : '📝 完成' }}
      </van-button>
      <van-button
        v-if="isEdit"
        type="danger"
        round
        block
        plain
        @click="handleDelete"
        style="margin-top: 10px;"
      >
        🗑️ 删除这条日记
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.diary-write {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.diary-write__date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin-bottom: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.diary-write__textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface);
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.diary-write__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.diary-write__textarea::placeholder {
  color: var(--color-text-hint);
}

/* Emoji 面板 */
.emoji-panel {
  margin-top: var(--space-base);
  padding: 10px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.emoji-panel__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.emoji-panel__grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 6px;
}

.emoji-panel__item {
  font-size: 22px;
  text-align: center;
  padding: 4px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast);
}

.emoji-panel__item:active {
  background: var(--color-primary-light);
}

/* 选项 */
.diary-write__options {
  margin-top: var(--space-base);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* 操作按钮 */
.diary-write__actions {
  margin-top: var(--space-xl);
}
</style>
```

- [ ] **Step 2: 检查 Vant DatePicker API**

Vant 4 的 `van-date-picker` 组件 API。确保 `model-value` 接受 `[dateStr]` 数组格式，`@confirm` 返回 `Date[]` 类型。如果 API 不同，调整为正确格式。

参考：Vant 4 DatePicker 使用 `v-model="currentDate"`（Date 类型），需在 `onConfirm` 中处理。

- [ ] **Step 3: Commit**

```bash
git add src/modules/diary/views/DiaryWrite.vue
git commit -m "feat(diary): add DiaryWrite editor page"
```

---

### Task 6: 日历联动

**Files:**
- Modify: `src/modules/calendar/types.ts` — 加 `hasDiary`
- Modify: `src/modules/calendar/store.ts` — 动态读取 diary store
- Modify: `src/modules/calendar/views/CalendarHome.vue` — 日详情弹窗 + 图例 + 日期点

- [ ] **Step 1: 改 calendar/types.ts**

```typescript
// 在 CalendarDay 接口中新增 hasDiary 字段
export interface CalendarDay {
  date: string;
  hasWishes: boolean;
  bothCheckedIn: boolean;
  hasAnniversary: boolean;
  hasDiary: boolean;       // ← 新增
}
```

- [ ] **Step 2: 改 calendar/store.ts**

在 `getDayMarks` 函数末尾新增 diary 检测逻辑：

```typescript
// 在 getDayMarks 函数中，return 语句之前加入：

let hasDiary = false;
try {
  const diaryDates = storage.get<string[]>('diary_dates_cache', []) ?? [];
  hasDiary = diaryDates.includes(dateStr);
} catch { /* ignore */ }

// return 语句改为：
return { hasWish, hasCheckIn, hasAnniversary, hasDiary };
```

同时在 store 顶部新增 diary cache 刷新逻辑——用一个 `refreshDiaryCache` 函数：

```typescript
// 在 useCalendarStore 内部

function refreshDiaryCache() {
  try {
    // 读取 diary_entries 直接计算日期集合
    const raw = storage.get<{ createdAt: number; isPrivate: boolean; authorId: string }[]>('diary_entries', []) ?? [];
    const currentUserId = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
    const dates = new Set<string>();
    for (const e of raw) {
      if (!e.isPrivate || e.authorId === currentUserId) {
        dates.add(new Date(e.createdAt).toISOString().slice(0, 10));
      }
    }
    storage.set('diary_dates_cache', [...dates]);
  } catch { /* ignore */ }
}

// 在 return 中暴露
return {
  // ...existing...
  refreshDiaryCache,
};
```

- [ ] **Step 3: 改 calendar/views/CalendarHome.vue**

三处改动：

**3a: `dayMarks` ref 解构加 `hasDiary`**

```typescript
const dayMarks = ref({ hasWish: false, hasCheckIn: false, hasAnniversary: false, hasDiary: false });
```

**3b: 日期网格加第四个点**

```html
<span v-if="store.getDayMarks(store.getDateStr(day)).hasDiary" class="dot dot--purple" />
```

**3c: 日详情弹窗加日记链接**

在弹窗内容中加入：

```html
<p v-if="dayMarks.hasDiary">
  📔 <router-link :to="'/diary?date=' + store.selectedDate" style="color: var(--color-primary);">查看日记</router-link>
</p>
```

**3d: 图例加第四项**

```html
<span class="legend-item"><span class="dot dot--purple" /> 有日记</span>
```

**3e: CSS 加紫色 dot**

```css
.dot--purple { background: #9c27b0; }
```

- [ ] **Step 4: 在 DiaryHome 中刷新日历缓存**

在 DiaryHome.vue 的 `<script setup>` 中，`onMounted` 时调用日历刷新：

```typescript
import { onMounted } from 'vue';

onMounted(async () => {
  try {
    const { useCalendarStore } = await import('@/modules/calendar/store');
    useCalendarStore().refreshDiaryCache();
  } catch { /* module might not be loaded yet */ }
});
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/types.ts src/modules/calendar/store.ts src/modules/calendar/views/CalendarHome.vue src/modules/diary/views/DiaryHome.vue
git commit -m "feat(diary): add calendar integration — diary dot, popup link, legend"
```

---

### Task 7: UserHome 菜单入口

**Files:**
- Modify: `src/modules/user/views/UserHome.vue`

- [ ] **Step 1: 加菜单项**

在 UserHome.vue 的 `<template>` 菜单列表中，找到积分中心的入口，在它下方加：

```html
<van-cell title="📔 共同日记" is-link to="/diary" />
```

当前菜单结构参考：

```html
<div class="menu-list">
  <van-cell title="🎨 主题" :value="currentThemeLabel" is-link @click="cycleTheme" />
  <van-cell title="🎨 主题切换" is-link to="/settings" />
  <van-cell title="🪙 积分中心" is-link to="/points" />
  <!-- 新增： -->
  <van-cell title="📔 共同日记" is-link to="/diary" />
  <van-cell title="📋 关于小甜豆" is-link />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/user/views/UserHome.vue
git commit -m "feat(diary): add diary entry in UserHome menu"
```

---

### Task 8: README 更新 + 最终验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

更新三处：

**1. 项目结构**——在 `src/modules/` 下新增：

```
│   ├── diary/                    # 共同日记模块（无 TabBar）
│   │   ├── components/           # DiaryCard
│   │   └── views/                # DiaryHome（时间线）+ DiaryWrite（编辑器）
```

**2. 开发阶段表**——阶段 4b 状态改为 ✅ 完成：

```
| 阶段 4b | 扩展 — 共同日记 | ✅ 完成 |
```

**3. 更新日志**——新增条目：

```markdown
### 2026-07-27 — 阶段 4b 完成

- `feat(diary)`: 共同日记模块 — 共享日记 + 私密标记、文字+Emoji、时间线列表
- `feat(diary)`: DiaryHome 时间线视图、DiaryWrite 编辑器（Emoji 面板 + 日期选择）
- `feat(diary)`: DiaryCard 组件 — 作者头像/昵称/私密标记/内容预览
- `feat(calendar)`: 日历联动 — 日记日期标记（紫色圆点）、日详情弹窗日记链接
- `feat(user)`: UserHome 菜单新增「📔 共同日记」入口
```

- [ ] **Step 2: 验证构建**

```bash
cd "E:/homework/开发/Claudecode/couple" && npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: 清理 + 提交**

```bash
git add README.md
git commit -m "docs: update README for phase 4b diary module"
```

- [ ] **Step 4: 推送**

```bash
git push
```

---

### 额外注意事项

1. **EmptyState 组件**：Task 4 的 DiaryHome 使用了 `EmptyState` 组件。如果现有 EmptyState 不支持 `action-text` 和 `@action` props，直接改用 inline HTML 空状态。

2. **Vant DatePicker API**：Task 5 的日期选择器需要确认 Vant 4 的 `van-date-picker` 正确用法。Vant 4 可能使用 `v-model`（Date 类型）而非 `model-value` 数组。

3. **`nextTick` import**：Task 5 中 `insertEmoji` 函数使用了 `nextTick`，确保已在 `<script setup>` 顶部从 `vue` 导入。

4. **循环依赖**：diary store 不直接 import 其他模块的 store（使用 `storage.get` 直接读 localStorage 获取 `currentUserId`）。calendar store 也是直接读 `storage` 中的 `diary_entries` 而非 import diary store，避免循环依赖。

5. **身份切换刷新**：当用户在 UserHome 切换身份后，diary 列表会自动更新（`visibleEntries` 是 computed，依赖 `storage.get('currentUserId')` 在每次计算时读取）。
