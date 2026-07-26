import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from './types';
import { storage } from '@/core/storage';

// === Mock 用户 ===
const MOCK_USERS: Record<string, User> = {
  user_a: {
    id: 'user_a',
    nickname: '小兔子',
    avatar: '🐰',
    partnerId: 'user_b',
    coupleCode: 'SWEET99',
    createdAt: Date.now(),
  },
  user_b: {
    id: 'user_b',
    nickname: '小熊',
    avatar: '🐻',
    partnerId: 'user_a',
    coupleCode: 'SWEET99',
    createdAt: Date.now(),
  },
};

export const useUserStore = defineStore('user', () => {
  const savedId = storage.get<string>('currentUserId', 'user_a');
  const currentUser = ref<User>(MOCK_USERS[savedId || 'user_a']);

  const partner = computed<User | null>(() => {
    const pid = currentUser.value.partnerId;
    return pid ? MOCK_USERS[pid] : null;
  });

  const currentUserId = computed(() => currentUser.value.id);
  const isBound = computed(() => !!currentUser.value.partnerId);
  const coupleCode = computed(() => currentUser.value.coupleCode ?? '');

  function switchTo(userId: string) {
    if (MOCK_USERS[userId]) {
      currentUser.value = MOCK_USERS[userId];
      storage.set('currentUserId', userId);
      window.dispatchEvent(new CustomEvent('identity-changed', { detail: { userId } }));
    }
  }

  function getAllUsers(): User[] {
    return Object.values(MOCK_USERS);
  }

  function bindCouple(code: string) {
    if (currentUser.value) {
      currentUser.value.coupleCode = code;
    }
  }

  function unbindCouple() {
    if (currentUser.value) {
      currentUser.value.partnerId = undefined;
      currentUser.value.coupleCode = undefined;
    }
  }

  return {
    currentUser, partner, currentUserId, isBound, coupleCode,
    switchTo, getAllUsers, bindCouple, unbindCouple,
  };
});