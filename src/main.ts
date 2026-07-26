import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Global styles
import './styles/reset.css';
import './styles/animations.css';

// Import all modules so they self-register via side-effect
// Order matters: core modules first, then feature modules
import './modules/theme';
import './modules/notify';
import './modules/interact';
import './modules/wish';
import './modules/calendar';
import './modules/user';
import './modules/points';

const app = createApp(App);

// Plugins
app.use(createPinia());
app.use(router);

app.mount('#app');