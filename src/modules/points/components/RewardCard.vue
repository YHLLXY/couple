<script setup lang="ts">
import type { Reward } from '../types';

defineProps<{
  reward: Reward;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [reward: Reward];
}>();
</script>

<template>
  <div
    class="reward-card"
    :class="{ 'reward-card--disabled': disabled }"
    @click="!disabled && emit('click', reward)"
  >
    <div class="reward-card__icon">{{ reward.icon }}</div>
    <div class="reward-card__title">{{ reward.title }}</div>
    <div class="reward-card__cost">
      <span class="reward-card__coin">🪙</span>
      {{ reward.cost }}
    </div>
    <div v-if="disabled" class="reward-card__badge">已下架</div>
  </div>
</template>

<style scoped>
.reward-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.reward-card:active { transform: scale(0.95); }

.reward-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reward-card__icon { font-size: 32px; }

.reward-card__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  text-align: center;
  line-height: 1.3;
}

.reward-card__cost {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.reward-card__coin { font-size: 14px; }

.reward-card__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  padding: 1px 6px;
  background: var(--color-text-secondary);
  color: #fff;
  border-radius: var(--radius-full);
}
</style>