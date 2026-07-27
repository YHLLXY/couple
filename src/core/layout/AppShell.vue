<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotifyStore } from '@/modules/notify/store';
import IdentitySwitcher from '@/modules/user/components/IdentitySwitcher.vue';
import TabBar from './TabBar.vue';

const route = useRoute();

const title = computed(() => {
  return (route.meta?.title as string) || '小甜豆';
});

const showBack = computed(() => {
  return route.meta?.showBack === true;
});

const router = useRouter();
const notifyStore = useNotifyStore();

onMounted(() => {
  notifyStore.loadNotifications();
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
        <IdentitySwitcher />
      </template>

      <template #right>
        <div class="notify-bell" @click="router.push('/notify')">
          <van-icon name="bell-o" size="20" />
          <span v-if="notifyStore.unreadCount > 0" class="notify-bell__badge">
            {{ notifyStore.unreadCount > 99 ? '99+' : notifyStore.unreadCount }}
          </span>
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

.notify-bell {
  position: relative;
  cursor: pointer;
  padding: 4px;
}

.notify-bell__badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  padding: 0 4px;
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