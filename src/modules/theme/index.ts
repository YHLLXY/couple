import { registerModule } from '@/core/registry';
import { useThemeStore } from './store';

registerModule({
  id: 'theme',
  name: '主题',
  routes: [],
  store: useThemeStore,
  enabled: true,
});