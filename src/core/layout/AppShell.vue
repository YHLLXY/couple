<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TabBar from './TabBar.vue';

const route = useRoute();

const title = computed(() => {
  return (route.meta?.title as string) || '小甜豆';
});

const showBack = computed(() => {
  return route.meta?.showBack === true;
});

function onBack() {
  window.history.back();
}
</script>

<template>
  <div class="app-shell">
    <van-nav-bar
      :title="title"
      :fixed="true"
      :placeholder="true"
      :safe-area-inset-top="true"
      :left-arrow="showBack"
      :z-index="99"
      @click-left="onBack"
    >
      <template #left v-if="!showBack">
        <div class="app-logo">
          <span class="logo-icon">🫘</span>
          <span class="logo-text">小甜豆</span>
        </div>
      </template>
    </van-nav-bar>

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <TabBar />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.logo-icon {
  font-size: 20px;
}

.logo-text {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-family: var(--font-family-round);
}

/* Page transition */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* Vant NavBar override */
:deep(.van-nav-bar) {
  background-color: var(--color-surface) !important;
}

:deep(.van-nav-bar__title) {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}
</style>