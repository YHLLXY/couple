import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Anniversary, CalendarDay } from './types';
import { storage } from '@/core/storage';
import { useWishStore } from '@/modules/wish/store';

const STORAGE_KEY = 'calendar_anniversaries';

// Mock 种子纪念日
function seedAnniversaries(): Anniversary[] {
  const now = new Date();
  const y = now.getFullYear();
  return [
    { id: 'a1', title: '在一起的日子 💕', date: `${y}-03-15`, icon: '💕', isRepeating: true },
    { id: 'a2', title: '第一次旅行 ✈️', date: `${y}-05-20`, icon: '✈️', isRepeating: true },
    { id: 'a3', title: '第一次接吻 💋', date: `${y}-01-08`, icon: '💋', isRepeating: true },
  ];
}

export const useCalendarStore = defineStore('calendar', () => {
  const stored = storage.get<Anniversary[]>(STORAGE_KEY);
  const anniversaries = ref<Anniversary[]>(stored && stored.length > 0 ? stored : seedAnniversaries());
  const selectedMonth = ref({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const selectedDate = ref<string>('');

  // 纪念日倒计时（7 天内）
  const upcomingAnniversaries = computed(() => {
    const now = new Date();
    return anniversaries.value
      .map((a) => {
        const d = new Date(a.date);
        // 对于重复纪念日，使用今年的日期
        const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1);
        return { ...a, nextDate: thisYear, daysLeft: Math.ceil((thisYear.getTime() - now.getTime()) / 86400000) };
      })
      .filter((a) => a.daysLeft >= 0 && a.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  });

  // === 日记缓存 ===
  function getDiaryDateSet(): Set<string> {
    try {
      const raw = storage.get<{ createdAt: number; isPrivate: boolean; authorId: string }[]>('diary_entries', []) ?? [];
      const currentUserId = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
      const dates = new Set<string>();
      for (const e of raw) {
        if (!e.isPrivate || e.authorId === currentUserId) {
          const dateStr = new Date(e.createdAt).toISOString().slice(0, 10);
          dates.add(dateStr);
        }
      }
      return dates;
    } catch {
      return new Set<string>();
    }
  }

  // 缓存日记日期集合（避免每次 getDayMarks 都遍历全部条目）
  let diaryDateCache: Set<string> | null = null;

  function refreshDiaryCache() {
    diaryDateCache = getDiaryDateSet();
  }

  function isDiaryDate(dateStr: string): boolean {
    if (diaryDateCache === null) refreshDiaryCache();
    return diaryDateCache!.has(dateStr);
  }

  // 获取某天的标记
  function getDayMarks(dateStr: string): { hasWish: boolean; hasCheckIn: boolean; hasAnniversary: boolean; hasDiary: boolean } {
    let hasWish = false;
    let hasCheckIn = false;

    try {
      const wishStore = useWishStore();
      hasWish = wishStore.wishes.some((w) => {
        const d = new Date(w.createdAt).toISOString().slice(0, 10);
        return d === dateStr;
      });
    } catch { /* store not available yet */ }

    try {
      const checkInDates = storage.get<string[]>('interact_checkin_dates', []) ?? [];
      hasCheckIn = checkInDates.includes(dateStr);
    } catch { /* ignore */ }

    const hasAnniversary = anniversaries.value.some((a) => {
      const ad = new Date(a.date);
      const md = new Date(dateStr);
      return a.isRepeating
        ? ad.getMonth() === md.getMonth() && ad.getDate() === md.getDate()
        : a.date === dateStr;
    });

    const hasDiary = isDiaryDate(dateStr);
    return { hasWish, hasCheckIn, hasAnniversary, hasDiary };
  }

  // 生成月历数据
  function getMonthGrid(): (number | null)[] {
    const { year, month } = selectedMonth.value;
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }

  function getDateStr(day: number): string {
    const { year, month } = selectedMonth.value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (selectedMonth.value.month === 1) {
      selectedMonth.value = { year: selectedMonth.value.year - 1, month: 12 };
    } else {
      selectedMonth.value = { ...selectedMonth.value, month: selectedMonth.value.month - 1 };
    }
  }

  function nextMonth() {
    if (selectedMonth.value.month === 12) {
      selectedMonth.value = { year: selectedMonth.value.year + 1, month: 1 };
    } else {
      selectedMonth.value = { ...selectedMonth.value, month: selectedMonth.value.month + 1 };
    }
  }

  function addAnniversary(a: Anniversary) {
    anniversaries.value.push(a);
    persist();
  }

  function removeAnniversary(id: string) {
    anniversaries.value = anniversaries.value.filter((a) => a.id !== id);
    persist();
  }

  function persist() {
    storage.set(STORAGE_KEY, anniversaries.value);
  }

  return {
    anniversaries, selectedMonth, selectedDate,
    upcomingAnniversaries,
    getDayMarks, getMonthGrid, getDateStr,
    prevMonth, nextMonth,
    addAnniversary, removeAnniversary,
    refreshDiaryCache,
  };
});