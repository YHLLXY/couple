import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Sticker } from './types';
import { storage } from '@/core/storage';

const STORAGE_KEY_CHECKIN = 'interact_checkin_dates';
const STORAGE_KEY_LOG = 'interact_activity_log';

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
  const checkInDates = ref<string[]>(storage.get<string[]>(STORAGE_KEY_CHECKIN, []) ?? []);
  const today = () => new Date().toISOString().slice(0, 10);
  const checkedInToday = computed(() => checkInDates.value.includes(today()));

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

  function doCheckIn() {
    const d = today();
    if (!checkInDates.value.includes(d)) {
      checkInDates.value.push(d);
      storage.set(STORAGE_KEY_CHECKIN, checkInDates.value);
      addActivity('checkin', '今天也想你 💕');
      // 加积分
      import('@/modules/points/store').then(({ usePointsStore }) => {
        const uid = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
        usePointsStore().earnPoints(uid, 'checkin');
      });
    }
  }

  // === 互动动态 ===
  const activityLog = ref<ActivityItem[]>(storage.get<ActivityItem[]>(STORAGE_KEY_LOG, []) ?? []);

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
    storage.set(STORAGE_KEY_LOG, activityLog.value);
  }

  function addSticker(sticker: Sticker) {
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
      const uid = storage.get<string>('currentUserId', 'user_a') ?? 'user_a';
      usePointsStore().earnPoints(uid, 'sticker_sent');
    });
  }

  return {
    stickers,
    checkInDates,
    checkedInToday,
    consecutiveDays,
    doCheckIn,
    activityLog,
    addSticker,
  };
});