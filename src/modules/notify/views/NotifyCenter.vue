<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifyStore } from '../store';
import EmptyState from '@/components/EmptyState.vue';

const notifyStore = useNotifyStore();
const router = useRouter();

onMounted(() => {
  notifyStore.loadNotifications();
  notifyStore.requestPushPermission();
});

const typeMap: Record<string, { icon: string; color: string }> = {
  wish_new: { icon: '📝', color: '#FF7A95' },
  wish_accepted: { icon: '🤗', color: '#7AE0C4' },
  wish_done: { icon: '💕', color: '#FFB84D' },
  checkin_remind: { icon: '🔔', color: '#A89A9A' },
  anniversary: { icon: '🎂', color: '#FF7A95' },
};

function onNotifyClick(notif: { id: string; relatedId?: string; read: boolean }) {
  notifyStore.markAsRead(notif.id);
  if (notif.relatedId) {
    router.push('/wish');
  }
}
</script>

<template>
  <div class="notify-page">
    <div class="notify-header">
      <span class="notify-header__title">🔔 通知</span>
      <span v-if="notifyStore.unreadCount > 0" class="mark-all-read" @click="notifyStore.markAllRead">
        全部已读
      </span>
    </div>

    <div v-if="notifyStore.notifications.length === 0" class="empty-wrap">
      <EmptyState icon="🔕" title="暂无通知" description="当心愿状态变化时，通知会出现在这里" />
    </div>

    <div v-else class="notify-list">
      <div
        v-for="notif in notifyStore.notifications"
        :key="notif.id"
        class="notify-item"
        :class="{ 'notify-item--unread': !notif.read }"
        :style="{ borderLeftColor: typeMap[notif.type]?.color || '#F0E6E6' }"
        @click="onNotifyClick(notif)"
      >
        <span class="notify-item__icon">{{ typeMap[notif.type]?.icon || '📌' }}</span>
        <div class="notify-item__body">
          <div class="notify-item__header">
            <span class="notify-item__title">{{ notif.title }}</span>
            <span v-if="!notif.read" class="notify-item__dot" />
          </div>
          <p class="notify-item__body-text">{{ notif.body }}</p>
          <span class="notify-item__time">{{ formatTime(notif.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}
</script>

<style scoped>
.notify-page {
  min-height: 100%;
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.notify-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-base);
  border-bottom: 1px solid var(--color-border);
}

.notify-header__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.mark-all-read {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.notify-list { padding: var(--space-sm); }

.notify-item {
  display: flex;
  gap: 12px;
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border-left: 3px solid var(--color-border);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.notify-item:active { background: var(--color-bg); }
.notify-item--unread { background: var(--color-primary-light); }

.notify-item__icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.notify-item__body { flex: 1; min-width: 0; }

.notify-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.notify-item__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.notify-item__dot {
  width: 6px; height: 6px;
  background: var(--color-danger);
  border-radius: 50%;
  flex-shrink: 0;
}

.notify-item__body-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-item__time {
  font-size: 10px;
  color: var(--color-text-hint);
}

.empty-wrap { padding-top: 80px; }
</style>