import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Sticker } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function currentUserId(): string {
  return useUserStore().currentUserId;
}
function currentCoupleId(): string | null {
  return useUserStore().coupleId;
}

export interface ActivityItem {
  id: string;
  type: 'checkin' | 'sticker';
  content: string;
  emoji?: string;
  createdAt: number;
}

export const useInteractStore = defineStore('interact', () => {
  // === 贴纸库 ===
  const stickers = ref<Sticker[]>([
    { id: '1', emoji: '❤️', label: '爱心' },
    { id: '2', emoji: '😘', label: '亲亲' },
    { id: '3', emoji: '🤗', label: '抱抱' },
    { id: '4', emoji: '😢', label: '想你了' },
    { id: '5', emoji: '🎉', label: '庆祝' },
    { id: '6', emoji: '🌸', label: '花花' },
    { id: '7', emoji: '💪', label: '加油' },
    { id: '8', emoji: '😋', label: '馋了' },
    { id: '9', emoji: '💤', label: '晚安' },
  ]);

  // === 签到 ===
  const CHECKIN_CACHE_KEY = 'sweetbean_checkins';
  const checkInDates = ref<string[]>(loadLocalCheckins());
  const loaded = ref(false);
  const today = () => new Date().toISOString().slice(0, 10);
  const checkedInToday = computed(() => checkInDates.value.includes(today()));

  /** 从 localStorage 加载签到日期 */
  function loadLocalCheckins(): string[] {
    try {
      const raw = localStorage.getItem(CHECKIN_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** 持久化签到日期到 localStorage */
  function persistCheckins(): void {
    try {
      localStorage.setItem(CHECKIN_CACHE_KEY, JSON.stringify(checkInDates.value));
    } catch { /* 静默跳过 */ }
  }

  async function loadCheckins(): Promise<void> {
    // 始终从本地加载
    checkInDates.value = loadLocalCheckins();

    // 如果已绑定，从 Supabase 同步（合并远程数据）
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (cid && uid) {
      const { data } = await supabase
        .from('checkins')
        .select('check_date')
        .eq('couple_id', cid)
        .eq('user_id', uid);
      if (data) {
        const remote = data.map((r: Record<string, unknown>) => r.check_date as string);
        // 合并：本地 + 远程去重
        const merged = new Set([...checkInDates.value, ...remote]);
        checkInDates.value = [...merged].sort();
        persistCheckins();
      }
    }
    loaded.value = true;
  }

  function getConsecutiveDays(): number {
    const sorted = [...checkInDates.value].sort().reverse();
    if (sorted.length === 0) return 0;
    let count = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = d.toISOString().slice(0, 10);
      if (sorted.includes(ds)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0 && ds === today()) {
        // 今天还没签到不影响连续计数
        d.setDate(d.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
    return count;
  }

  const consecutiveDays = computed(() => getConsecutiveDays());

  async function doCheckIn(): Promise<{ success: boolean; reason?: string }> {
    const d = today();
    if (checkInDates.value.includes(d)) {
      return { success: false, reason: '今天已经签到过了' };
    }

    // ✅ 始终本地存储（不依赖绑定状态）
    checkInDates.value.push(d);
    persistCheckins();
    addActivity('checkin', '今天也想你 💕');

    // 同步到日历 store（让日历小绿点实时更新）
    import('@/modules/calendar/store').then(({ useCalendarStore }) => {
      const calStore = useCalendarStore();
      const updated = new Set(calStore.checkinDateSet);
      updated.add(d);
      calStore.setCheckinDates(updated);
    });

    // 如果已绑定，同步到 Supabase（异步，不阻塞）
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (cid && uid) {
      supabase
        .from('checkins')
        .insert({ couple_id: cid, user_id: uid, check_date: d })
        .then(({ error }) => {
          if (error) console.error('[Interact] Supabase checkin sync failed:', error.message);
        });

      // 加积分
      import('@/modules/points/store').then(({ usePointsStore }) => {
        usePointsStore().earnPoints(uid, 'checkin');
      });
    }

    return { success: true };
  }

  // === 互动动态 ===
  const ACTIVITY_CACHE_KEY = 'sweetbean_activity_log';
  const activityLog = ref<ActivityItem[]>(loadCachedActivities());

  /** 从 localStorage 恢复缓存的活动 */
  function loadCachedActivities(): ActivityItem[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** 持久化活动到 localStorage */
  function persistActivities(): void {
    try {
      localStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(activityLog.value));
    } catch {
      // localStorage 满了就静默跳过
    }
  }

  function addActivity(type: 'checkin' | 'sticker', content: string, emoji?: string) {
    activityLog.value.unshift({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      emoji,
      createdAt: Date.now(),
    });
    // 只保留最近 50 条
    if (activityLog.value.length > 50) {
      activityLog.value = activityLog.value.slice(0, 50);
    }
    persistActivities();
  }

  /** 从 Supabase 恢复签到和贴纸活动（补充 localStorage 中没有的数据） */
  async function loadActivities(): Promise<void> {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;

    // 从 Supabase 加载签到记录，重建活动
    const { data: checkins } = await supabase
      .from('checkins')
      .select('check_date, created_at')
      .eq('couple_id', cid)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);

    if (checkins) {
      const existingIds = new Set(activityLog.value.map(a => a.id));
      for (const row of checkins) {
        const r = row as Record<string, unknown>;
        const dateStr = r.check_date as string;
        const actId = `checkin_${dateStr}`;
        if (!existingIds.has(actId)) {
          activityLog.value.push({
            id: actId,
            type: 'checkin',
            content: '今天也想你 💕',
            createdAt: new Date(r.created_at as string).getTime(),
          });
        }
      }
    }

    // 从 Supabase 加载贴纸记录
    const { data: stickers } = await supabase
      .from('stickers')
      .select('emoji, label, created_at')
      .eq('couple_id', cid)
      .eq('sender_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);

    if (stickers) {
      const existingIds = new Set(activityLog.value.map(a => a.id));
      for (const row of stickers) {
        const r = row as Record<string, unknown>;
        const actId = `sticker_${r.created_at}`;
        if (!existingIds.has(actId)) {
          activityLog.value.push({
            id: actId,
            type: 'sticker',
            content: `发送了「${r.label}」`,
            emoji: r.emoji as string,
            createdAt: new Date(r.created_at as string).getTime(),
          });
        }
      }
    }

    // 按时间倒序排列
    activityLog.value.sort((a, b) => b.createdAt - a.createdAt);
    if (activityLog.value.length > 50) {
      activityLog.value = activityLog.value.slice(0, 50);
    }
    persistActivities();
  }

  async function addSticker(sticker: Sticker) {
    const cid = currentCoupleId();
    const uid = currentUserId();

    // 持久化到 Supabase
    if (cid && uid) {
      supabase
        .from('stickers')
        .insert({
          couple_id: cid,
          sender_id: uid,
          sticker_id: sticker.id,
          emoji: sticker.emoji,
          label: sticker.label,
        })
        .then(({ error }) => {
          if (error) console.error('[Interact] Failed to insert sticker:', error.message);
        });
    }

    addActivity('sticker', `发送了「${sticker.label}」`, sticker.emoji);

    // 发送通知
    import('@/modules/notify/store').then(({ useNotifyStore }) => {
      useNotifyStore().addNotification(
        'checkin_remind',
        'TA给你发了贴纸',
        `${sticker.emoji} TA发了一个「${sticker.label}」贴纸`,
      );
    });

    // 加积分
    import('@/modules/points/store').then(({ usePointsStore }) => {
      usePointsStore().earnPoints(uid, 'sticker_sent');
    });
  }

  return {
    stickers,
    checkInDates,
    loaded,
    checkedInToday,
    consecutiveDays,
    loadCheckins,
    doCheckIn,
    activityLog,
    loadActivities,
    addSticker,
  };
});
