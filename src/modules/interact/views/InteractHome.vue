<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { showToast } from 'vant';
import { useInteractStore } from '../store';
import type { Sticker } from '../types';

const store = useInteractStore();

onMounted(() => {
  store.loadCheckins();
});

// 贴纸飘浮动效
const floatingStickers = ref<{ id: string; emoji: string; x: number; delay: number }[]>([]);
let floatId = 0;

function onStickerClick(sticker: Sticker) {
  const id = `float_${floatId++}`;
  floatingStickers.value.push({
    id,
    emoji: sticker.emoji,
    x: Math.random() * 60 + 20, // 20-80% horizontal
    delay: 0,
  });
  store.addSticker(sticker);
  setTimeout(() => {
    floatingStickers.value = floatingStickers.value.filter((f) => f.id !== id);
  }, 1000);
}

function onCheckIn() {
  if (store.checkedInToday) {
    showToast('今天已经签到过了～');
    return;
  }
  store.doCheckIn();
  showToast({ message: '签到成功！今天也想你 💕', icon: 'success' });
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}
</script>

<template>
  <div class="interact-page">
    <!-- 签到区 -->
    <div class="checkin-section">
      <button
        class="checkin-btn"
        :class="{ 'checkin-btn--done': store.checkedInToday }"
        @click="onCheckIn"
      >
        <span class="checkin-btn__icon">{{ store.checkedInToday ? '✅' : '💝' }}</span>
        <span class="checkin-btn__text">
          {{ store.checkedInToday ? '今日已签到' : '今天也想你' }}
        </span>
      </button>
      <p v-if="store.consecutiveDays > 0" class="checkin-streak">
        🔥 已连续签到 <strong>{{ store.consecutiveDays }}</strong> 天
      </p>
    </div>

    <!-- 贴纸墙 -->
    <div class="sticker-section">
      <h3 class="section-title">💌 贴纸墙</h3>
      <div class="sticker-grid">
        <button
          v-for="s in store.stickers"
          :key="s.id"
          class="sticker-item"
          @click="onStickerClick(s)"
        >
          <span class="sticker-emoji">{{ s.emoji }}</span>
          <span class="sticker-label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <!-- 互动动态 -->
    <div class="activity-section">
      <h3 class="section-title">📋 互动动态</h3>
      <div v-if="store.activityLog.length === 0" class="activity-empty">
        <p>还没有互动记录</p>
        <p class="sub">签到或发送贴纸来留下足迹吧～</p>
      </div>
      <div v-else class="activity-list">
        <div
          v-for="item in store.activityLog"
          :key="item.id"
          class="activity-item"
        >
          <span class="activity-emoji">{{ item.emoji || '💝' }}</span>
          <span class="activity-content">{{ item.content }}</span>
          <span class="activity-time">{{ formatTime(item.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 飘浮贴纸层 -->
    <div class="floating-layer" aria-hidden="true">
      <span
        v-for="f in floatingStickers"
        :key="f.id"
        class="floating-sticker"
        :style="{ left: f.x + '%' }"
      >
        {{ f.emoji }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.interact-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
  position: relative;
}

/* 签到区 */
.checkin-section {
  text-align: center;
  padding: var(--space-xl) 0 var(--space-lg);
}

.checkin-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 48px;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-elevated);
}

.checkin-btn:active { transform: scale(0.95); }

.checkin-btn--done {
  background: var(--color-border);
  box-shadow: none;
  cursor: default;
}

.checkin-btn__icon { font-size: 40px; }
.checkin-btn__text { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }

.checkin-streak {
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 贴纸墙 */
.sticker-section { margin-bottom: var(--space-lg); }

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.sticker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.sticker-item:active { transform: scale(0.9); }

.sticker-emoji { font-size: 32px; }
.sticker-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

/* 动态 */
.activity-empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.activity-empty .sub { font-size: var(--font-size-xs); color: var(--color-text-hint); margin-top: 4px; }

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.activity-emoji { font-size: 20px; flex-shrink: 0; }
.activity-content { flex: 1; font-size: var(--font-size-sm); color: var(--color-text-primary); }
.activity-time { font-size: var(--font-size-xs); color: var(--color-text-hint); flex-shrink: 0; }

/* 飘浮贴纸 */
.floating-layer {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.floating-sticker {
  position: absolute;
  bottom: 80px;
  font-size: 36px;
  animation: stickerFloat 1s var(--ease-out) both;
}

@keyframes stickerFloat {
  0% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  50% { opacity: 0.8; transform: translateY(-60px) scale(1.3) rotate(10deg); }
  100% { opacity: 0; transform: translateY(-120px) scale(0.5) rotate(-20deg); }
}
</style>