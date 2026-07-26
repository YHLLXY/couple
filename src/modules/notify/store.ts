import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppNotification, NotificationType } from './types';

let nextId = 1;

export const useNotifyStore = defineStore('notify', () => {
  const notifications = ref<AppNotification[]>([]);
  const pushEnabled = ref(false);

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.read).length
  );

  function addNotification(type: NotificationType, title: string, body: string, relatedId?: string) {
    notifications.value.unshift({
      id: `notif_${nextId++}_${Date.now()}`,
      type,
      title,
      body,
      read: false,
      createdAt: Date.now(),
      relatedId,
    });
  }

  function markAsRead(id: string) {
    const n = notifications.value.find((n) => n.id === id);
    if (n) n.read = true;
  }

  function markAllRead() {
    notifications.value.forEach((n) => { n.read = true; });
  }

  function clearAll() {
    notifications.value = [];
  }

  return { notifications, pushEnabled, unreadCount, addNotification, markAsRead, markAllRead, clearAll };
});