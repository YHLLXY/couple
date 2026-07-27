<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '../store';

const userStore = useUserStore();
const visible = ref(false);

const badgeAvatar = computed(() => userStore.currentUser?.avatar ?? '👤');
const badgeName = computed(() => userStore.currentUser?.name ?? '未登录');
</script>

<template>
  <div class="identity-badge" @click="visible = true">
    <span class="identity-badge__avatar">{{ badgeAvatar }}</span>
    <span class="identity-badge__name">{{ badgeName }}</span>
    <span class="identity-badge__arrow">▾</span>
  </div>

  <van-popup v-model:show="visible" position="bottom" round :safe-area-inset-bottom="true">
    <div class="switcher-panel">
      <h3 class="switcher-title">账号信息</h3>

      <!-- 当前用户 -->
      <div class="switcher-item switcher-item--active">
        <span class="switcher-item__avatar">{{ badgeAvatar }}</span>
        <div class="switcher-item__body">
          <span class="switcher-item__name">{{ badgeName }}（当前）</span>
          <span class="switcher-item__relation">当前身份</span>
        </div>
        <span class="switcher-item__check">✓</span>
      </div>

      <!-- 另一半 -->
      <template v-if="userStore.isBound && userStore.partner">
        <div class="switcher-divider" />
        <div class="switcher-item">
          <span class="switcher-item__avatar">{{ userStore.partner.avatar }}</span>
          <div class="switcher-item__body">
            <span class="switcher-item__name">{{ userStore.partner.name }}</span>
            <span class="switcher-item__relation">你的另一半 💕</span>
          </div>
        </div>
        <div class="switcher-footer">
          <p class="switcher-footer__hint">
            你们已绑定，数据传输使用同一情侣对
          </p>
        </div>
      </template>

      <!-- 未绑定 -->
      <template v-else>
        <div class="switcher-divider" />
        <div class="switcher-empty">
          <p class="switcher-empty__icon">💌</p>
          <p class="switcher-empty__text">还没有绑定另一半</p>
          <p class="switcher-empty__hint">去设置页面绑定，共享甜蜜数据</p>
        </div>
      </template>
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
  transition: background var(--duration-fast);
}
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

.switcher-divider {
  height: 8px;
  background: var(--color-bg);
  margin: 8px 0;
}

.switcher-empty {
  padding: 24px 16px;
  text-align: center;
}
.switcher-empty__icon { font-size: 40px; margin: 0 0 8px; }
.switcher-empty__text {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}
.switcher-empty__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
}

.switcher-footer {
  padding: 12px 16px;
  text-align: center;
}
.switcher-footer__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}
</style>