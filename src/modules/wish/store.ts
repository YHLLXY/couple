import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Wish, WishStatus } from './types';

export const useWishStore = defineStore('wish', () => {
  const wishes = ref<Wish[]>([]);
  const activeTab = ref<'received' | 'sent'>('received');

  const pendingWishes = computed(() =>
    wishes.value.filter((w) => w.status === 'pending')
  );

  const doneWishes = computed(() =>
    wishes.value.filter((w) => w.status === 'done')
  );

  function addWish(wish: Wish) {
    wishes.value.unshift(wish);
  }

  function updateWishStatus(id: string, status: WishStatus) {
    const wish = wishes.value.find((w) => w.id === id);
    if (wish) {
      wish.status = status;
      if (status === 'done') {
        wish.completedAt = Date.now();
      }
    }
  }

  function removeWish(id: string) {
    wishes.value = wishes.value.filter((w) => w.id !== id);
  }

  return { wishes, activeTab, pendingWishes, doneWishes, addWish, updateWishStatus, removeWish };
});