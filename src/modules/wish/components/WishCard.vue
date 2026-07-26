<script setup lang="ts">
import type { Wish } from '../types';

defineProps<{
  wish: Wish;
  isMine: boolean;
}>();

const emit = defineEmits<{
  click: [wish: Wish];
}>();

const categoryMap: Record<string, string> = {
  food: '🍽️ 吃的',
  chore: '🏠 家务',
  romance: '💕 浪漫',
  company: '👫 陪伴',
  surprise: '🎉 惊喜',
  other: '📦 其他',
};

const statusMap: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '待响应', color: '#FF7A95', bg: '#FFEEF3' },
  accepted: { text: '已接单', color: '#7AE0C4', bg: '#E8FFF5' },
  done: { text: '已完成', color: '#C4B8B8', bg: '#F0E6E6' },
  postponed: { text: '已延期', color: '#FFB84D', bg: '#FFF8EE' },
  ignored: { text: '已忽略', color: '#C4B8B8', bg: '#F0E6E6' },
};

const priorityMap: Record<string, string> = {
  normal: '',
  urgent: '⚡',
  romantic: '💕',
};
</script>

<template>
  <div
    class="wish-card"
    :class="{ 'wish-card--done': wish.status === 'done' }"
    @click="emit('click', wish)"
  >
    <span
      class="wish-card__badge"
      :style="{ color: statusMap[wish.status].color, background: statusMap[wish.status].bg }"
    >
      {{ statusMap[wish.status].text }}
    </span>

    <div class="wish-card__header">
      <span class="wish-card__category">
        {{ categoryMap[wish.category] || wish.category }}
      </span>
      <span v-if="priorityMap[wish.priority]" class="wish-card__priority">
        {{ priorityMap[wish.priority] }}
      </span>
    </div>

    <p class="wish-card__content">{{ wish.content }}</p>

    <img v-if="wish.imageUrl" :src="wish.imageUrl" class="wish-card__image" alt="" />

    <p v-if="wish.proofNote" class="wish-card__proof">{{ wish.proofNote }}</p>

    <div class="wish-card__footer">
      <span class="wish-card__author">
        {{ isMine ? '我' : 'TA' }} · {{ formatTime(wish.createdAt) }}
      </span>
      <span v-if="wish.status === 'done'" class="wish-card__done-stamp">✅</span>
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
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.wish-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-card);
  position: relative;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
  break-inside: avoid;
  margin-bottom: 12px;
  -webkit-tap-highlight-color: transparent;
}

.wish-card:active {
  transform: scale(0.97);
}

.wish-card--done {
  background: linear-gradient(135deg, #FFF8F2, #FFEEF3);
  opacity: 0.85;
}

.wish-card__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.wish-card__header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding-right: 48px;
}

.wish-card__category {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium);
}

.wish-card__priority {
  font-size: var(--font-size-xs);
}

.wish-card__content {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: var(--line-height-normal);
  margin-bottom: 8px;
}

.wish-card--done .wish-card__content {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.wish-card__image {
  width: 100%;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.wish-card__proof {
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  background: #E8FFF5;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.wish-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wish-card__author {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}

.wish-card__done-stamp {
  font-size: 18px;
  transform: rotate(15deg);
}
</style>