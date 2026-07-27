import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppNotification, NotificationType } from './types';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/modules/user/store';

function currentUserId(): string {
  return useUserStore().currentUserId;
}

function currentCoupleId(): string | null {
  return useUserStore().coupleId;
}

function mapRowToNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: row.body as string,
    read: (row.read as boolean) || false,
    createdAt: new Date(row.created_at as string).getTime(),
    relatedId: row.related_wish_id as string | undefined,
  };
}

export const useNotifyStore = defineStore('notify', () => {
  const notifications = ref<AppNotification[]>([]);
  const pushEnabled = ref(false);

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.read).length,
  );

  async function loadNotifications(): Promise<void> {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('couple_id', cid)
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (data) {
      notifications.value = data.map(mapRowToNotification);
    }
  }

  async function addNotification(type: NotificationType, title: string, body: string, relatedId?: string) {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        couple_id: cid,
        user_id: uid,
        type,
        title,
        body,
        read: false,
        related_wish_id: relatedId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Notify] Failed to insert notification:', error.message);
      return;
    }

    if (data) {
      const n = mapRowToNotification(data);
      notifications.value.unshift(n);
      tryPush(n);
    }
  }

  async function markAsRead(id: string) {
    const uid = currentUserId();
    if (!uid) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', uid);

    if (error) {
      console.error('[Notify] Failed to mark as read:', error.message);
      return;
    }

    const n = notifications.value.find((item) => item.id === id);
    if (n) {
      n.read = true;
    }
  }

  async function markAllRead() {
    const uid = currentUserId();
    if (!uid) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', uid)
      .eq('read', false);

    if (error) {
      console.error('[Notify] Failed to mark all read:', error.message);
      return;
    }

    notifications.value.forEach((n) => {
      n.read = true;
    });
  }

  async function clearAll() {
    const cid = currentCoupleId();
    const uid = currentUserId();
    if (!cid || !uid) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('couple_id', cid)
      .eq('user_id', uid);

    if (error) {
      console.error('[Notify] Failed to clear notifications:', error.message);
      return;
    }

    notifications.value = [];
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

  return {
    notifications, pushEnabled, unreadCount,
    loadNotifications, addNotification, markAsRead, markAllRead, clearAll,
    requestPushPermission,
  };
});
