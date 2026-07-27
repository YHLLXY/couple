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