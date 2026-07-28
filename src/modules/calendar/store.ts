import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Anniversary } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';
import { useWishStore } from '@/modules/wish/store';

const ANNIVERSARIES_KEY = 'sweetbean_calendar_anniversaries';

function currentUserId(): string {
  return useUserStore().currentUserId;
}

export const useCalendarStore = defineStore('calendar', () => {
  // 从 localStorage 加载纪念日（纯配置数据，非共享数据）
  const anniversaries = ref<Anniversary[]>(
    (() => {
      try {
        const raw = localStorage.getItem(ANNIVERSARIES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })(),
  );
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

  // === 日记缓存（从 Supabase 读取） ===
  let diaryDateCache: Set<string> | null = null;

  async function refreshDiaryCache(): Promise<void> {
    const cid = useUserStore().coupleId;
    if (!cid) return;
    const uid = currentUserId();
    const { data } = await supabase
      .from('diary_entries')
      .select('entry_date, is_private, author_id')
      .eq('couple_id', cid);
    if (data) {
      diaryDateCache = new Set<string>();
      for (const row of data) {
        const r = row as Record<string, unknown>;
        if (!(r.is_private as boolean) || (r.author_id as string) === uid) {
          diaryDateCache.add(r.entry_date as string);
        }
      }
    }
  }

  function isDiaryDate(dateStr: string): boolean {
    if (diaryDateCache === null) return false;
    return diaryDateCache.has(dateStr);
  }

  // === 签到日期缓存（从 Supabase 加载） ===
  const checkinDateSet = ref<Set<string>>(new Set());
  let checkinsLoaded = false;

  function setCheckinDates(dates: Set<string>) {
    checkinDateSet.value = dates;
  }

  /** 从 Supabase 加载签到日期 */
  async function loadCheckinDates(): Promise<void> {
    if (checkinsLoaded) return;
    const cid = useUserStore().coupleId;
    const uid = currentUserId();
    if (!cid || !uid) return;
    const { data } = await supabase
      .from('checkins')
      .select('check_date')
      .eq('couple_id', cid)
      .eq('user_id', uid);
    if (data) {
      const dates = new Set<string>();
      for (const row of data) {
        dates.add((row as Record<string, unknown>).check_date as string);
      }
      checkinDateSet.value = dates;
      checkinsLoaded = true;
    }
  }

  // 获取某天的标记
  function getDayMarks(dateStr: string): { hasWish: boolean; hasCheckIn: boolean; hasAnniversary: boolean; hasDiary: boolean } {
    let hasWish = false;

    try {
      const wishStore = useWishStore();
      hasWish = wishStore.wishes.some((w) => {
        const d = new Date(w.createdAt).toISOString().slice(0, 10);
        return d === dateStr;
      });
    } catch {
      /* store not available yet */
    }

    const hasCheckIn = checkinDateSet.value.has(dateStr);

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
    localStorage.setItem(ANNIVERSARIES_KEY, JSON.stringify(anniversaries.value));
  }

  return {
    anniversaries,
    selectedMonth,
    selectedDate,
    upcomingAnniversaries,
    checkinDateSet,
    getDayMarks,
    getMonthGrid,
    getDateStr,
    prevMonth,
    nextMonth,
    addAnniversary,
    removeAnniversary,
    refreshDiaryCache,
    setCheckinDates,
    loadCheckinDates,
  };
});