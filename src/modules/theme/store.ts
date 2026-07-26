import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { ThemeName } from './types';
import { storage } from '@/core/storage';

export const useThemeStore = defineStore('theme', () => {
  const saved = storage.get<ThemeName>('theme', 'default');
  const currentTheme = ref<ThemeName>(saved || 'default');

  function applyTheme(name: ThemeName) {
    document.documentElement.setAttribute('data-theme', name === 'default' ? '' : name);
  }

  function setTheme(name: ThemeName) {
    currentTheme.value = name;
    storage.set('theme', name);
    applyTheme(name);
  }

  // Apply on init
  applyTheme(currentTheme.value);

  // Watch for changes
  watch(currentTheme, (val) => {
    applyTheme(val);
  });

  return { currentTheme, setTheme };
});