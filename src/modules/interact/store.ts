import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { InteractState, Sticker } from './types';

export const useInteractStore = defineStore('interact', () => {
  const stickers = ref<Sticker[]>([
    { id: '1', emoji: '❤️', label: '爱心' },
    { id: '2', emoji: '😘', label: '亲亲' },
    { id: '3', emoji: '🤗', label: '抱抱' },
    { id: '4', emoji: '😢', label: '想你了' },
    { id: '5', emoji: '🎉', label: '庆祝' },
    { id: '6', emoji: '🌸', label: '花花' },
  ]);
  const likes = ref(0);
  const checkInToday = ref(false);

  const totalLikes = computed(() => likes.value);

  function addLike() {
    likes.value++;
  }

  function doCheckIn() {
    checkInToday.value = true;
  }

  function resetCheckIn() {
    checkInToday.value = false;
  }

  return { stickers, likes, checkInToday, totalLikes, addLike, doCheckIn, resetCheckIn };
});