<script setup lang="ts">
defineProps<{
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-icon">{{ icon }}</div>
    <h3 v-if="title" class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <van-button
      v-if="actionText"
      type="primary"
      round
      size="small"
      @click="emit('action')"
    >
      {{ actionText }}
    </van-button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxl) var(--space-lg);
  text-align: center;
  min-height: 200px;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: var(--space-base);
  opacity: 0.8;
}

.empty-title {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-xs);
}

.empty-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  max-width: 220px;
  line-height: var(--line-height-loose);
  margin-bottom: var(--space-lg);
}
</style>