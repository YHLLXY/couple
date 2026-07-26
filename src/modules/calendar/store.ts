import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Anniversary } from './types';

export const useCalendarStore = defineStore('calendar', () => {
  const anniversaries = ref<Anniversary[]>([]);
  const selectedDate = ref<string>('');

  const upcomingAnniversaries = computed(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return anniversaries.value.filter((a) => {
      const d = new Date(a.date).getTime();
      return d > now && d - now <= sevenDays;
    });
  });

  function addAnniversary(a: Anniversary) {
    anniversaries.value.push(a);
  }

  function removeAnniversary(id: string) {
    anniversaries.value = anniversaries.value.filter((a) => a.id !== id);
  }

  return { anniversaries, selectedDate, upcomingAnniversaries, addAnniversary, removeAnniversary };
});