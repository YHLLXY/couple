<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW();

interface ChangelogItem {
  type: 'feat' | 'fix';
  text: string;
}

interface Changelog {
  version: string;
  date: string;
  changes: ChangelogItem[];
}

const visible = ref(false);
const updating = ref(false);
const changelog = ref<Changelog | null>(null);

const typeLabel: Record<string, string> = {
  feat: '🆕',
  fix: '🔧',
};

// 检测到更新时显示弹窗
watch(needRefresh, (val) => {
  if (val) {
    visible.value = true;
    loadChangelog();
  }
});

/** 加载 changelog（不会被 SW 缓存，始终拿到服务端最新版本） */
async function loadChangelog() {
  try {
    const res = await fetch('/changelog.json', { cache: 'no-cache' });
    if (res.ok) {
      changelog.value = await res.json();
    }
  } catch {
    // 加载失败静默跳过，弹窗仍然可用
  }
}

async function handleUpdate() {
  updating.value = true;
  await updateServiceWorker(true);
}

function handleDismiss() {
  visible.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-fade">
      <div v-if="visible" class="update-overlay" @click.self="handleDismiss">
        <div class="update-card">
          <!-- 装饰豆子 -->
          <div class="update-card__beans">
            <span class="bean bean--left">🫘</span>
            <span class="bean bean--right">🫘</span>
          </div>

          <!-- 图标 -->
          <div class="update-card__icon">
            <span class="icon-sparkle">✨</span>
          </div>

          <!-- 标题 -->
          <h2 class="update-card__title">小甜豆更新啦</h2>
          <p class="update-card__sub">
            {{ changelog ? `${changelog.date} · ${changelog.version}` : '有新版本可用' }}
          </p>

          <!-- 变更日志 -->
          <div v-if="changelog" class="update-card__changelog">
            <div
              v-for="(item, i) in changelog.changes"
              :key="i"
              class="changelog-item"
            >
              <span class="changelog-item__icon">{{ typeLabel[item.type] || '•' }}</span>
              <span class="changelog-item__text">{{ item.text }}</span>
            </div>
          </div>
          <p v-else class="update-card__desc">更新后就能看到最新内容～</p>

          <!-- 按钮 -->
          <button
            class="update-card__btn"
            :class="{ 'update-card__btn--loading': updating }"
            :disabled="updating"
            @click="handleUpdate"
          >
            <span v-if="updating" class="btn-loading-spinner" />
            <span>{{ updating ? '更新中...' : '立即更新 ✨' }}</span>
          </button>

          <button
            v-if="!updating"
            class="update-card__later"
            @click="handleDismiss"
          >
            稍后再说
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.update-card {
  position: relative;
  width: 100%;
  max-width: 340px;
  max-height: 80vh;
  background: #fff;
  border-radius: 24px;
  padding: 32px 24px 24px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(255, 122, 149, 0.3), 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部装饰条 */
.update-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #FF7A95, #FFB8C9, #FF7A95);
  flex-shrink: 0;
}

/* 装饰豆子 */
.update-card__beans {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  pointer-events: none;
}
.bean {
  position: absolute;
  font-size: 20px;
  opacity: 0.5;
  animation: beanBounce 2s ease-in-out infinite;
}
.bean--left { left: 16px; animation-delay: 0s; }
.bean--right { right: 16px; animation-delay: 0.6s; }

@keyframes beanBounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(10deg); }
}

/* 图标 */
.update-card__icon {
  margin-bottom: 8px;
  flex-shrink: 0;
}
.icon-sparkle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  font-size: 28px;
  background: linear-gradient(135deg, #FFF0F3, #FFE0E6);
  box-shadow: 0 4px 16px rgba(255, 122, 149, 0.25);
}

/* 标题 */
.update-card__title {
  font-size: 20px;
  font-weight: 800;
  color: #333;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.update-card__sub {
  font-size: 12px;
  color: #bbb;
  margin-bottom: 16px;
  flex-shrink: 0;
}

/* 描述（无 changelog 时） */
.update-card__desc {
  font-size: 14px;
  color: #999;
  line-height: 1.5;
  margin-bottom: 20px;
  padding: 0 8px;
  flex-shrink: 0;
}

/* 变更日志 */
.update-card__changelog {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #FFFAFB;
  border-radius: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  -webkit-overflow-scrolling: touch;
}

.changelog-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
}

.changelog-item__icon {
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 1px;
}

.changelog-item__text {
  color: #555;
}

/* 主按钮 */
.update-card__btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #FF7A95, #FF9DB5);
  box-shadow: 0 6px 20px rgba(255, 122, 149, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
}

.update-card__btn:active {
  transform: scale(0.97);
  box-shadow: 0 4px 12px rgba(255, 122, 149, 0.3);
}

.update-card__btn--loading {
  opacity: 0.8;
  cursor: default;
}

.btn-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 稍后 */
.update-card__later {
  margin-top: 10px;
  background: none;
  border: none;
  font-size: 13px;
  color: #bbb;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.update-card__later:hover {
  color: #999;
}

/* 过渡动画 */
.update-fade-enter-active {
  transition: opacity 0.3s ease;
}
.update-fade-enter-active .update-card {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.update-fade-leave-active {
  transition: opacity 0.2s ease;
}
.update-fade-leave-active .update-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.update-fade-enter-from {
  opacity: 0;
}
.update-fade-enter-from .update-card {
  transform: scale(0.8) translateY(20px);
  opacity: 0;
}
.update-fade-leave-to {
  opacity: 0;
}
.update-fade-leave-to .update-card {
  transform: scale(0.9);
  opacity: 0;
}
</style>
