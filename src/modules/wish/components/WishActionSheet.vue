<script setup lang="ts">
import { computed } from 'vue';
import type { Wish, WishStatus } from '../types';

const props = defineProps<{
  wish: Wish | null;
  visible: boolean;
  isMine: boolean;
}>();

const emit = defineEmits<{
  close: [];
  action: [status: WishStatus, extra?: { proofNote?: string }];
}>();

const actions = computed(() => {
  if (!props.wish) return [];
  const items: { key: WishStatus; icon: string; text: string; desc: string; cls?: string }[] = [];

  if (props.wish.status === 'pending') {
    items.push({ key: 'accepted', icon: '🤗', text: '我来完成', desc: '接单，告诉TA你来做' });
    items.push({ key: 'postponed', icon: '⏰', text: '改天再做', desc: '今天不方便，推到明天' });
  }
  if (props.wish.status === 'pending' || props.wish.status === 'accepted' || props.wish.status === 'postponed') {
    items.push({
      key: 'done', icon: '💕', text: '小惊喜！已完成',
      desc: '直接完成 + 可附一句话证明', cls: 'highlight',
    });
  }

  return items;
});

function handleAction(key: WishStatus) {
  if (key === 'done' && !props.isMine) {
    const note = prompt('附一句话证明（可选）：');
    emit('action', key, { proofNote: note || undefined });
    return;
  }
  emit('action', key);
}
</script>

<template>
  <van-action-sheet
    :show="visible"
    :actions="[]"
    :title="wish ? `「${wish.content.slice(0, 15)}${wish.content.length > 15 ? '...' : ''}」` : ''"
    @close="emit('close')"
    :close-on-click-action="false"
    cancel-text="取消"
  >
    <div class="action-sheet-content">
      <div v-if="wish" class="action-summary">
        <p class="action-summary__text">"{{ wish.content }}"</p>
        <span class="action-summary__meta">
          {{ wish.fromUserId === 'user_a' ? '🐰 小兔子' : '🐻 小熊' }}
          · {{ formatTimeBrief(wish.createdAt) }}
        </span>
      </div>

      <div class="action-items">
        <div
          v-for="act in actions"
          :key="act.key"
          class="action-item"
          :class="act.cls"
          @click="handleAction(act.key)"
        >
          <span class="action-item__icon">{{ act.icon }}</span>
          <div class="action-item__body">
            <span class="action-item__text">{{ act.text }}</span>
            <span class="action-item__desc">{{ act.desc }}</span>
          </div>
          <span class="action-item__arrow">›</span>
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>

<script lang="ts">
function formatTimeBrief(ts: number): string {
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
.action-sheet-content {
  padding: 0 0 8px;
}

.action-summary {
  padding: 12px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.action-summary__text {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.action-summary__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
  display: block;
}

.action-items {
  padding: 8px 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.action-item:active {
  background: var(--color-bg);
}

.action-item.highlight {
  background: linear-gradient(135deg, #FFEEF3, #FFF0E8);
}

.action-item__icon {
  font-size: 24px;
}

.action-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.action-item__text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.highlight .action-item__text {
  color: var(--color-primary);
}

.action-item__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.action-item__arrow {
  font-size: 18px;
  color: var(--color-text-hint);
}
</style>