<script setup lang="ts">
import { computed } from 'vue';
import { usePointsStore } from '../store';
import { LEVEL_CONFIG } from '../types';
import PointsBadge from '../components/PointsBadge.vue';

const pointsStore = usePointsStore();

const nextLevelMin = computed(() => {
  const idx = LEVEL_CONFIG.findIndex(l => l.level === pointsStore.currentLevel.level);
  return idx < LEVEL_CONFIG.length - 1 ? LEVEL_CONFIG[idx + 1].min : null;
});

const pointsToNextLevel = computed(() => {
  if (nextLevelMin.value === null) return null;
  return Math.max(0, nextLevelMin.value - pointsStore.currentBalance);
});
</script>

<template>
  <div class="points-page">
    <!-- 余额区域 -->
    <div class="balance-section">
      <div class="balance-ring">
        <span class="balance-amount">{{ pointsStore.currentBalance }}</span>
        <span class="balance-unit">积分</span>
      </div>
      <div class="balance-level">{{ pointsStore.currentLevel.name }}</div>
      <div class="balance-next">
        <template v-if="pointsToNextLevel !== null">
          距离下一级还需 {{ pointsToNextLevel }} 分
        </template>
        <template v-else>已达最高等级 🎉</template>
      </div>
    </div>

    <!-- 积分规则 -->
    <div class="section">
      <h3 class="section-title">🎯 积分规则</h3>
      <div class="rules-list">
        <div v-for="rule in pointsStore.rules" :key="rule.id" class="rule-item">
          <div class="rule-info">
            <span class="rule-label">{{ rule.label }}</span>
            <span v-if="rule.cooldown > 0" class="rule-cooldown">{{ rule.cooldown }}h冷却</span>
          </div>
          <span class="rule-points" :class="{ 'rule-points--off': !rule.enabled }">
            {{ rule.enabled ? `+${rule.points}` : '已关闭' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 近期流水 -->
    <div class="section">
      <h3 class="section-title">📋 积分流水</h3>
      <div v-if="pointsStore.recentLedger.length === 0" class="empty-hint">
        还没有积分记录
      </div>
      <div v-for="item in pointsStore.recentLedger" :key="item.id" class="ledger-item">
        <div class="ledger-left">
          <span class="ledger-reason">{{ item.reason }}</span>
          <span class="ledger-time">{{ new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
        <span class="ledger-amount" :class="item.amount > 0 ? 'ledger-amount--earn' : 'ledger-amount--spend'">
          {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
        </span>
      </div>
    </div>

    <!-- 前往奖励商店 -->
    <div class="bottom-action">
      <van-button type="primary" round block @click="$router.push('/points/rewards')">
        🎁 奖励商店
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.points-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

/* 余额区域 */
.balance-section {
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  margin-bottom: var(--space-base);
  background: linear-gradient(135deg, #fff9e6, #fff3cc);
  border-radius: var(--radius-md);
}

.balance-ring {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #fff;
  box-shadow: 0 4px 16px rgba(255, 170, 0, 0.35);
  margin-bottom: var(--space-sm);
}

.balance-amount {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.balance-unit {
  font-size: var(--font-size-xs);
  opacity: 0.85;
}

.balance-level {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.balance-next {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

/* 通用 section */
.section {
  margin-bottom: var(--space-base);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

/* 规则 */
.rules-list {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-base);
  border-bottom: 1px solid var(--color-border);
}

.rule-item:last-child { border-bottom: none; }

.rule-info { display: flex; align-items: center; gap: 8px; }

.rule-label { font-size: var(--font-size-sm); color: var(--color-text-primary); }

.rule-cooldown {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.rule-points {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #ffaa00;
}

.rule-points--off {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

/* 流水 */
.ledger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.ledger-item:last-child { border-bottom: none; }

.ledger-left { display: flex; flex-direction: column; gap: 2px; }

.ledger-reason { font-size: var(--font-size-sm); color: var(--color-text-primary); }

.ledger-time { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.ledger-amount { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }

.ledger-amount--earn { color: #4caf50; }

.ledger-amount--spend { color: var(--color-danger); }

.empty-hint {
  text-align: center;
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 底部 */
.bottom-action {
  margin-top: var(--space-base);
}
</style>