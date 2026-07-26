<script setup lang="ts">
import { useThemeStore } from '../store';
import { THEME_LIST } from '../types';
import { useNotifyStore } from '@/modules/notify/store';
import type { ThemeName } from '../types';

const themeStore = useThemeStore();
const notifyStore = useNotifyStore();

function onThemeSelect(name: ThemeName) {
  themeStore.setTheme(name);
}

function onPushToggle(val: boolean) {
  if (val) {
    notifyStore.requestPushPermission();
  }
}
</script>

<template>
  <div class="settings-page">
    <!-- 主题选择 -->
    <h3 class="section-title">🎨 主题选择</h3>
    <div class="theme-cards">
      <div
        v-for="t in THEME_LIST"
        :key="t.name"
        class="theme-card"
        :class="{ 'theme-card--active': themeStore.currentTheme === t.name }"
        :style="{ '--theme-color': t.primaryColor }"
        @click="onThemeSelect(t.name)"
      >
        <div class="theme-card__preview" :style="{ background: t.primaryColor }" />
        <span class="theme-card__label">{{ t.label }}</span>
        <span v-if="themeStore.currentTheme === t.name" class="theme-card__check">✓</span>
      </div>
    </div>

    <!-- 通知设置 -->
    <h3 class="section-title">🔔 通知</h3>
    <div class="settings-card">
      <van-cell title="浏览器推送通知" center>
        <template #right-icon>
          <van-switch
            :model-value="notifyStore.pushEnabled"
            size="22px"
            @update:model-value="onPushToggle"
          />
        </template>
      </van-cell>
    </div>

    <!-- 关于 -->
    <h3 class="section-title">📋 关于</h3>
    <div class="settings-card">
      <van-cell title="版本" value="0.2.0" />
      <van-cell title="小甜豆" value="情侣心愿小程序" />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.section-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-lg) 0 var(--space-sm);
  padding-left: 4px;
}

.theme-cards {
  display: flex;
  gap: 12px;
}

.theme-card {
  flex: 1;
  text-align: center;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  transition: all var(--duration-fast);
  position: relative;
}

.theme-card--active {
  border-color: var(--theme-color);
}

.theme-card__preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 auto 8px;
}

.theme-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.theme-card__check {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  color: var(--theme-color);
}

.settings-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>