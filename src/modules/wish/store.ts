import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Wish, WishStatus, WishCategory, WishPriority } from './types';
import { storage } from '@/core/storage';

const STORAGE_KEY = 'wishes';

// === Mock 种子数据 ===
function seedWishes(): Wish[] {
  const now = Date.now();
  const hour = 3600000;
  return [
    {
      id: 'w1',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '想吃你做的番茄炒蛋',
      category: 'food',
      priority: 'urgent',
      status: 'pending',
      createdAt: now - hour * 2,
      expireAt: new Date().setHours(23, 59, 59, 999),
    },
    {
      id: 'w2',
      fromUserId: 'user_a',
      toUserId: 'user_b',
      content: '今晚一起看电影吧',
      category: 'romance',
      priority: 'normal',
      status: 'accepted',
      createdAt: now - hour * 5,
    },
    {
      id: 'w3',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '帮我把衣服叠好',
      category: 'chore',
      priority: 'normal',
      status: 'done',
      createdAt: now - hour * 24,
      completedAt: now - hour * 20,
      proofNote: '叠好了！整整齐齐 ✨',
    },
    {
      id: 'w4',
      fromUserId: 'user_a',
      toUserId: 'user_b',
      content: '给我唱首歌',
      category: 'romance',
      priority: 'romantic',
      status: 'postponed',
      createdAt: now - hour * 30,
    },
    {
      id: 'w5',
      fromUserId: 'user_b',
      toUserId: 'user_a',
      content: '周末一起去公园散步',
      category: 'company',
      priority: 'normal',
      status: 'pending',
      createdAt: now - hour * 8,
    },
  ];
}

function generateId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWishStore = defineStore('wish', () => {
  // 初始化
  const stored = storage.get<Wish[]>(STORAGE_KEY);
  const wishes = ref<Wish[]>(stored && stored.length > 0 ? stored : seedWishes());

  const statusFilter = ref<'all' | 'pending' | 'active' | 'done'>('all');
  const currentUserId = ref<string>('user_a');

  function setCurrentUserId(id: string) {
    currentUserId.value = id;
  }

  const filteredWishes = computed(() => {
    let list = wishes.value.filter(
      (w) => w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value,
    );
    switch (statusFilter.value) {
      case 'pending':
        list = list.filter((w) => w.status === 'pending');
        break;
      case 'active':
        list = list.filter((w) => w.status === 'accepted' || w.status === 'postponed');
        break;
      case 'done':
        list = list.filter((w) => w.status === 'done');
        break;
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  });

  const pendingCount = computed(
    () => wishes.value.filter((w) => w.toUserId === currentUserId.value && w.status === 'pending').length,
  );
  const activeCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value) &&
          (w.status === 'accepted' || w.status === 'postponed'),
      ).length,
  );
  const doneCount = computed(
    () =>
      wishes.value.filter(
        (w) =>
          (w.toUserId === currentUserId.value || w.fromUserId === currentUserId.value) &&
          w.status === 'done',
      ).length,
  );

  function addWish(data: {
    fromUserId: string;
    toUserId: string;
    content: string;
    category: WishCategory;
    priority: WishPriority;
    imageUrl?: string;
    anonymous?: boolean;
  }) {
    const wish: Wish = {
      id: generateId(),
      ...data,
      status: 'pending',
      createdAt: Date.now(),
      expireAt: new Date().setHours(23, 59, 59, 999),
    };
    wishes.value.unshift(wish);
    persist();
    return wish;
  }

  function updateWishStatus(
    id: string,
    status: WishStatus,
    extra?: { proofImageUrl?: string; proofNote?: string },
  ) {
    const wish = wishes.value.find((w) => w.id === id);
    if (!wish) return;
    wish.status = status;
    if (status === 'done') {
      wish.completedAt = Date.now();
      if (extra?.proofImageUrl) wish.proofImageUrl = extra.proofImageUrl;
      if (extra?.proofNote) wish.proofNote = extra.proofNote;
    }
    persist();
  }

  function removeWish(id: string) {
    wishes.value = wishes.value.filter((w) => w.id !== id);
    persist();
  }

  function getWishById(id: string): Wish | undefined {
    return wishes.value.find((w) => w.id === id);
  }

  function persist() {
    storage.set(STORAGE_KEY, wishes.value);
  }

  return {
    wishes, statusFilter, currentUserId,
    filteredWishes, pendingCount, activeCount, doneCount,
    setCurrentUserId, addWish, updateWishStatus, removeWish, getWishById,
  };
});