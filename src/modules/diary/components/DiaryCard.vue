<script setup lang="ts">
import type { DiaryEntry } from '../types';

const props = defineProps<{
  entry: DiaryEntry;
}>();

const emit = defineEmits<{
  (e: 'click', entry: DiaryEntry): void;
}>();

function getAuthorName(userId: string): string {
  return userId === 'user_a' ? '小兔子' : '小熊';
}

function getAuthorAvatar(userId: string): string {
  return userId === 'user_a' ? '🐰' : '🐻';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<template>
  <div class="diary-card" @click="emit('click', entry)">
    <div class="diary-card__header">
      <div class="diary-card__author">
        <span class="diary-card__avatar">{{ getAuthorAvatar(entry.authorId) }}</span>
        <span class="diary-card__name">{{ getAuthorName(entry.authorId) }}</span>
      </div>
      <span v-if="entry.isPrivate" class="diary-card__private">🔒</span>
    </div>
    <p class="diary-card__content">{{ entry.content }}</p>
    <span class="diary-card__time">{{ formatTime(entry.createdAt) }}</span>
  </div>
</template>

<style scoped>
.diary-card {
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.diary-card:active {
  background: var(--color-primary-light);
}

.diary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.diary-card__author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.diary-card__avatar {
  font-size: 24px;
}

.diary-card__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.diary-card__private {
  font-size: 14px;
}

.diary-card__content {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
  white-space: pre-wrap;
}

.diary-card__time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>