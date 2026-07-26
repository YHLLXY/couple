<script setup lang="ts">
import { useUserStore } from '../store';

const store = useUserStore();
</script>

<template>
  <div class="page-placeholder">
    <div class="placeholder-icon">👤</div>
    <h2 class="placeholder-title">个人中心</h2>
    <p class="placeholder-desc">管理你的资料，绑定另一半，开启甜蜜之旅</p>
    <div class="placeholder-stats">
      <div class="stat-item">
        <span class="stat-value">{{ store.isBound ? '💕' : '💔' }}</span>
        <span class="stat-label">绑定状态</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ store.coupleCode || '---' }}</span>
        <span class="stat-label">情侣码</span>
      </div>
    </div>
    <van-button type="primary" round size="small">
      {{ store.isBound ? '查看另一半' : '绑定另一半' }}
    </van-button>
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