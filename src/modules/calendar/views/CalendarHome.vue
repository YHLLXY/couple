<script setup lang="ts">
import { useCalendarStore } from '../store';

const store = useCalendarStore();
</script>

<template>
  <div class="page-placeholder">
    <div class="placeholder-icon">📅</div>
    <h2 class="placeholder-title">甜蜜日历</h2>
    <p class="placeholder-desc">记录每一个重要的日子，用甜蜜填满每一天</p>
    <div class="placeholder-stats">
      <div class="stat-item">
        <span class="stat-value">{{ store.anniversaries.length }}</span>
        <span class="stat-label">纪念日</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ store.upcomingAnniversaries.length }}</span>
        <span class="stat-label">即将到来</span>
      </div>
    </div>
    <van-button type="primary" round size="small">添加纪念日 📌</van-button>
  </div>
</template>

<style scoped>
.page-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-xl);
  text-align: center;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: var(--space-base);
}

.placeholder-title {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

.placeholder-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
  max-width: 240px;
}

.placeholder-stats {
  display: flex;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}
</style>