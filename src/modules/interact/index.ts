import { registerModule } from '@/core/registry';
import { interactRoutes } from './routes';
import { useInteractStore } from './store';

registerModule({
  id: 'interact',
  name: '互动',
  icon: 'chat-o',
  routes: interactRoutes,
  store: useInteractStore,
  tabBar: true,
  tabOrder: 1,
  enabled: true,
});