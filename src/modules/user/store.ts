import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from './types';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null);
  const partner = ref<User | null>(null);

  const isBound = computed(() => !!currentUser.value?.partnerId);
  const coupleCode = computed(() => currentUser.value?.coupleCode ?? '');

  function setUser(user: User) {
    currentUser.value = user;
  }

  function setPartner(user: User) {
    partner.value = user;
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
    partner.value = null;
  }

  return { currentUser, partner, isBound, coupleCode, setUser, setPartner, bindCouple, unbindCouple };
});