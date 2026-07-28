<script setup lang="ts">
import { ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW();

const visible = ref(false);
const updating = ref(false);

// 检测到更新时显示弹窗
import { watch } from 'vue';
watch(needRefresh, (val) => {
  if (val) visible.value = true;
});

async function handleUpdate() {
  updating.value = true;
  await updateServiceWorker(true); // true = 刷新页面
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
          <p class="update-card__desc">有新版本可用，更新后就能看到最新内容～</p>

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
  max-width: 320px;
  background: #fff;
  border-radius: 24px;
  padding: 36px 28px 28px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(255, 122, 149, 0.3), 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
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
  margin-bottom: 12px;
}
.icon-sparkle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 32px;
  background: linear-gradient(135deg, #FFF0F3, #FFE0E6);
  box-shadow: 0 4px 16px rgba(255, 122, 149, 0.25);
}

/* 标题 */
.update-card__title {
  font-size: 22px;
  font-weight: 800;
  color: #333;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* 描述 */
.update-card__desc {
  font-size: 14px;
  color: #999;
  line-height: 1.5;
  margin-bottom: 24px;
  padding: 0 8px;
}

/* 主按钮 */
.update-card__btn {
  width: 100%;
  padding: 14px;
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
}

.update-card__btn:active {
  transform: scale(0.97);
  box-shadow: 0 4px 12px rgba(255, 122, 149, 0.3);
}

.update-card__btn--loading {
  opacity: 0.8;
  cursor: default;
}

/* 加载旋转 */
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
  margin-top: 12px;
  background: none;
  border: none;
  font-size: 13px;
  color: #bbb;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
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
