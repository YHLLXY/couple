import { registerModule } from '@/core/registry';
import { useNotifyStore } from './store';

registerModule({
  id: 'notify',
  name: '通知',
  routes: [],
  store: useNotifyStore,
  enabled: true,
});