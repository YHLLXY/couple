<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../store';
import type { User } from '../types';

const userStore = useUserStore();
const visible = ref(false);

function onSwitch(user: User) {
  userStore.switchTo(user.id);
  visible.value = false;
}
</script>

<template>
  <div class="identity-badge" @click="visible = true">
    <span class="identity-badge__avatar">{{ userStore.currentUser.avatar }}</span>
    <span class="identity-badge__name">{{ userStore.currentUser.nickname }}</span>
    <span class="identity-badge__arrow">▾</span>
  </div>

  <van-popup v-model:show="visible" position="bottom" round :safe-area-inset-bottom="true">
    <div class="switcher-panel">
      <h3 class="switcher-title">切换身份</h3>
      <div
        v-for="user in userStore.getAllUsers()"
        :key="user.id"
        class="switcher-item"
        :class="{ 'switcher-item--active': user.id === userStore.currentUserId }"
        @click="onSwitch(user)"
      >
        <span class="switcher-item__avatar">{{ user.avatar }}</span>
        <div class="switcher-item__body">
          <span class="switcher-item__name">
            {{ user.nickname }}
            <template v-if="user.id === userStore.currentUserId">（当前）</template>
          </span>
          <span class="switcher-item__relation">
            {{ user.id === userStore.currentUserId ? '当前身份' : '你的另一半 💕' }}
          </span>
        </div>
        <span v-if="user.id === userStore.currentUserId" class="switcher-item__check">✓</span>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.identity-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

.identity-badge__avatar { font-size: 20px; }
.identity-badge__name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}
.identity-badge__arrow {
  font-size: 10px;
  color: var(--color-text-hint);
}

.switcher-panel { padding: 8px 0 16px; }
.switcher-title {
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.switcher-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--duration-fast);
}
.switcher-item:active { background: var(--color-bg); }
.switcher-item--active { background: var(--color-primary-light); }

.switcher-item__avatar { font-size: 32px; }
.switcher-item__body { flex: 1; display: flex; flex-direction: column; }
.switcher-item__name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}
.switcher-item__relation {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.switcher-item__check { font-size: 16px; color: var(--color-primary); }
</style>