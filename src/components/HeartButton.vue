<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  liked?: boolean;
  count?: number;
  size?: 'small' | 'normal' | 'large';
}>();

const emit = defineEmits<{
  click: [];
}>();

const animating = ref(false);

function handleClick() {
  animating.value = true;
  emit('click');
  setTimeout(() => {
    animating.value = false;
  }, 350);
}

const sizeMap = { small: 28, normal: 36, large: 48 };
</script>

<template>
  <button
    class="heart-button"
    :class="{
      'heart-button--liked': liked,
      'heart-button--animating': animating,
    }"
    :style="{ width: `${sizeMap[size || 'normal']}px`, height: `${sizeMap[size || 'normal']}px` }"
    @click="handleClick"
  >
    <span class="heart-icon">{{ liked ? '❤️' : '🤍' }}</span>
    <span v-if="count !== undefined" class="heart-count">{{ count }}</span>
  </button>
</template>

<style scoped>
.heart-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: var(--radius-full);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.heart-button:active {
  transform: scale(0.9);
}

.heart-button--animating {
  animation: heartFloat 0.8s var(--ease-out) both;
}

.heart-icon {
  font-size: 1.2em;
  line-height: 1;
  transition: transform var(--duration-fast) var(--ease-spring);
}

.heart-button--liked .heart-icon {
  transform: scale(1.1);
}

.heart-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
</style>