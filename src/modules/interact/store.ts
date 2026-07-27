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
  const checkInDates = ref<string[]>([]);
  const loaded = ref(false);
  const today = () => new Date().toISOString().slice(0, 10);
  const checkedInToday = computed(() => checkInDates.value.includes(today()));

  async function loadCheckins(): Promise<void> {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;
    const { data } = await supabase
      .from('checkins')
      .select('check_date')
      .eq('couple_id', cid)
      .eq('user_id', uid);
    if (data) {
      checkInDates.value = data.map((r: Record<string, unknown>) => r.check_date as string);
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

  async function doCheckIn() {
    const d = today();
    if (checkInDates.value.includes(d)) return;

    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;

    const { error } = await supabase
      .from('checkins')
      .insert({
        couple_id: cid,
        user_id: uid,
        check_date: d,
      });

    if (error) {
      console.error('[Interact] Failed to insert checkin:', error.message);
      return;
    }

    checkInDates.value.push(d);
    addActivity('checkin', '今天也想你 💕');

    // 加积分
    import('@/modules/points/store').then(({ usePointsStore }) => {
      usePointsStore().earnPoints(uid, 'checkin');
    });
  }

  // === 互动动态 ===
  const activityLog = ref<ActivityItem[]>([]);

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
    addSticker,
  };
});
