// src/modules/diary/index.ts
import { registerModule } from '@/core/registry';
import { diaryRoutes } from './routes';

registerModule({
  id: 'diary',
  name: '日记',
  routes: diaryRoutes,
  tabBar: false,
  enabled: true,
});