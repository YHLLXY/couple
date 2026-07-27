import './lib/supabase';

// IMPORTANT: Modules MUST be imported BEFORE router — they self-register
// routes via side-effect, and router reads the registry at import time.
// Global styles and Vue core are safe to import anywhere.
import './styles/reset.css';
import './styles/animations.css';
import './modules/theme';
import './modules/notify';
import './modules/interact';
import './modules/wish';
import './modules/calendar';
import './modules/user';
import './modules/points';
import './modules/diary';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// Plugins
app.use(createPinia());
app.use(router);

app.mount('#app');