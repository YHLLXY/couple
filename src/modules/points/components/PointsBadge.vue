<script setup lang="ts">
import { usePointsStore } from '../store';

const pointsStore = usePointsStore();
</script>

<template>
  <div class="points-badge" @click="$router.push('/points')">
    <span class="points-badge__icon">🪙</span>
    <span class="points-badge__value">{{ pointsStore.currentBalance }}</span>
    <span class="points-badge__level">{{ pointsStore.currentLevel.name }}</span>
  </div>
</template>

<style scoped>
.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #fff;
  box-shadow: 0 2px 6px rgba(255, 170, 0, 0.3);
}

.points-badge__icon { font-size: 14px; }

.points-badge__value { min-width: 20px; text-align: center; }

.points-badge__level {
  opacity: 0.9;
  font-size: 11px;
  font-weight: var(--font-weight-normal);
}
</style>