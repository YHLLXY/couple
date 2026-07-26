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

  function requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notify] Browser does not support Notification API');
      return;
    }
    if (Notification.permission === 'granted') {
      pushEnabled.value = true;
      return;
    }
    if (Notification.permission === 'denied') {
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

  function cleanup() {
    const cutoff = Date.now() - MAX_AGE_MS;
    const before = notifications.value.length;
    notifications.value = notifications.value.filter((n) => n.createdAt > cutoff);
    if (notifications.value.length < before) persist();
  }

  function persist() {
    storage.set(STORAGE_KEY, notifications.value);
  }

  // 初始化清理
  cleanup();

  return {
    notifications, pushEnabled, unreadCount,
    addNotification, markAsRead, markAllRead, clearAll, requestPushPermission,
  };
});