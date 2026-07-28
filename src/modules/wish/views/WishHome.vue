<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWishStore } from '../store';
import { useUserStore } from '@/modules/user/store';
import WishCard from '../components/WishCard.vue';
import WishActionSheet from '../components/WishActionSheet.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { Wish, WishStatus } from '../types';

const router = useRouter();
const wishStore = useWishStore();
const userStore = useUserStore();

const filterTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'pending' as const, label: '待响应' },
  { key: 'active' as const, label: '进行中' },
  { key: 'done' as const, label: '已完成' },
];

function setFilter(key: 'all' | 'pending' | 'active' | 'done') {
  wishStore.statusFilter = key;
}

// Action sheet
const selectedWish = ref<Wish | null>(null);
const showActionSheet = ref(false);

function onCardClick(wish: Wish) {
  selectedWish.value = wish;
  showActionSheet.value = true;
}

function onActionClose() {
  showActionSheet.value = false;
  selectedWish.value = null;
}

function onAction(status: WishStatus, extra?: { proofNote?: string }) {
  if (!selectedWish.value) return;
  wishStore.updateWishStatus(selectedWish.value.id, status, extra);
  showActionSheet.value = false;
  selectedWish.value = null;
}

function isMine(wish: Wish) {
  return wish.fromUserId === userStore.currentUserId;
}

// Pull refresh
const refreshing = ref(false);
function onRefresh() {
  refreshing.value = true;
  setTimeout(() => { refreshing.value = false; }, 600);
}

onMounted(async () => {
  // 确保用户数据已加载
  if (!userStore.isLoggedIn) {
    await userStore.initAuth();
  }
  // Supabase 数据加载 + Realtime 订阅
  if (!wishStore.loaded) {
    wishStore.loadWishes();
    wishStore.subscribeRealtime();
  }
});
</script>

<template>
  <div class="wish-wall">
    <!-- Filter tabs -->
    <div class="filter-tabs">
      <span
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ 'filter-tab--active': wishStore.statusFilter === tab.key }"
        @click="setFilter(tab.key)"
      >
        {{ tab.label }}
        <sup v-if="tab.key === 'pending' && wishStore.pendingCount" class="filter-count">{{ wishStore.pendingCount }}</sup>
        <sup v-else-if="tab.key === 'active' && wishStore.activeCount" class="filter-count">{{ wishStore.activeCount }}</sup>
        <sup v-else-if="tab.key === 'done' && wishStore.doneCount" class="filter-count">{{ wishStore.doneCount }}</sup>
      </span>
    </div>

    <!-- Card grid -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div v-if="wishStore.filteredWishes.length > 0" class="card-grid">
        <WishCard
          v-for="wish in wishStore.filteredWishes"
          :key="wish.id"
          :wish="wish"
          :is-mine="isMine(wish)"
          @click="onCardClick"
        />
      </div>

      <div v-else class="empty-wrap">
        <!-- 未绑定提示 -->
        <div v-if="userStore.isLoggedIn && !userStore.isBound" class="bind-hint">
          <p class="bind-hint__icon">💑</p>
          <p class="bind-hint__title">需要先绑定另一半</p>
          <p class="bind-hint__desc">绑定后你们就可以互相发送心愿啦</p>
          <van-button type="primary" round size="small" to="/bind-couple">去绑定 💕</van-button>
        </div>
        <!-- 已绑定但没数据 -->
        <EmptyState
          v-else
          icon="💝"
          title="还没有心愿"
          description="点击右下角按钮，告诉TA你想要什么"
        />
      </div>
    </van-pull-refresh>

    <!-- FAB -->
    <van-floating-bubble icon="plus" @click="router.push('/wish/create')" />

    <!-- Action sheet -->
    <WishActionSheet
      :wish="selectedWish"
      :visible="showActionSheet"
      :is-mine="isMine(selectedWish!)"
      @close="onActionClose"
      @action="onAction"
    />
  </div>
</template>

<style scoped>
.wish-wall {
  min-height: 100%;
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.filter-tabs {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-base);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-tabs::-webkit-scrollbar { display: none; }

.filter-tab {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.filter-tab--active {
  background: var(--color-primary);
  color: #fff;
  font-weight: var(--font-weight-bold);
}

.filter-count {
  color: inherit;
  margin-left: 2px;
}

.card-grid {
  columns: 2;
  column-gap: 10px;
  padding: 0 var(--space-base);
}

.empty-wrap {
  padding-top: 80px;
}

.bind-hint {
  text-align: center;
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}
.bind-hint__icon { font-size: 48px; }
.bind-hint__title { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
.bind-hint__desc { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-sm); }
</style>