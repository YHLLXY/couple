<script setup lang="ts">
import { ref, computed } from 'vue';
import { showDialog, showToast } from 'vant';
import type { ActionSheetAction } from 'vant';
import { usePointsStore } from '../store';
import RewardCard from '../components/RewardCard.vue';
import type { Reward, ExchangeRecord } from '../types';

const pointsStore = usePointsStore();
const activeTab = ref<'exchange' | 'history'>('exchange');
const showCreate = ref(false);
const newTitle = ref('');
const newCost = ref(5);
const newIcon = ref('🎁');

// ActionSheet 状态
const showActionSheetPopup = ref(false);
const actionSheetTitle = ref('');
const actionSheetDescription = ref('');
const actionSheetActions = ref<ActionSheetAction[]>([]);
const actionSheetCancelText = ref('取消');
let pendingActionSheetCallback: (() => void) | null = null;

const rewardIcons = ['🎁', '💆', '🍳', '🎮', '🧹', '🎬', '🍰', '💐', '🎵', '📖'];

// 对方创建的奖励（我可以兑换的）
const canExchange = computed(() => pointsStore.availableRewards);

// 我创建的奖励
const myRewards = computed(() => pointsStore.myRewards);

// 待确认：我是奖励创建者，有人申请兑换我的奖励
const pendingForMe = computed(() => {
  const uid = pointsStore.currentUserId();
  return pointsStore.exchanges.filter(e => {
    const reward = pointsStore.rewards.find(r => r.id === e.rewardId);
    return reward && reward.creatorId === uid && e.status === 'pending_confirm';
  });
});

// 我发起的兑换
const myRequests = computed(() => {
  const uid = pointsStore.currentUserId();
  return pointsStore.exchanges.filter(e => e.userId === uid);
});

function getUserName(userId: string): string {
  return userId === 'user_a' ? '小兔子' : '小熊';
}

function getRewardById(id: string): Reward | undefined {
  return pointsStore.rewards.find(r => r.id === id);
}

function handleExchange(reward: Reward) {
  actionSheetTitle.value = `确认兑换「${reward.title}」？`;
  actionSheetDescription.value = `将消耗 ${reward.cost} 积分`;
  actionSheetCancelText.value = '取消';
  pendingActionSheetCallback = () => {
    const result = pointsStore.requestExchange(reward.id);
    if (result) {
      showToast('已发送兑换请求，等待对方确认');
    } else {
      showToast('积分不足或兑换失败');
    }
  };
  actionSheetActions.value = [
    { name: `兑换（消耗${reward.cost}分）` },
  ];
  showActionSheetPopup.value = true;
}

function onActionSelect(action: ActionSheetAction, index: number) {
  if (index === 0 && pendingActionSheetCallback) {
    pendingActionSheetCallback();
  }
  showActionSheetPopup.value = false;
}

function handleConfirm(exchange: ExchangeRecord) {
  const reward = getRewardById(exchange.rewardId);
  showDialog({
    title: '确认兑现？',
    message: `确认后将扣除对方 ${reward?.cost ?? 0} 积分`,
  }).then(() => {
    pointsStore.confirmExchange(exchange.id);
    showToast('已确认兑现！');
  }).catch(() => {});
}

function handleCancel(exchange: ExchangeRecord) {
  showDialog({
    title: '取消兑换？',
    message: '对方会看到兑换被取消',
  }).then(() => {
    pointsStore.cancelExchange(exchange.id);
    showToast('已取消');
  }).catch(() => {});
}

function handleCreateReward() {
  if (!newTitle.value.trim()) {
    showToast('请输入奖励名称');
    return;
  }
  pointsStore.createReward(newTitle.value.trim(), newCost.value, newIcon.value);
  showToast('奖励已创建！');
  showCreate.value = false;
  newTitle.value = '';
  newCost.value = 5;
  newIcon.value = '🎁';
}

function handleToggleReward(reward: Reward) {
  pointsStore.toggleReward(reward.id);
}
</script>

<template>
  <div class="reward-shop">
    <!-- Tab 切换 -->
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="兑换奖励" name="exchange" />
      <van-tab title="兑换记录" name="history" />
    </van-tabs>

    <!-- Tab 1: 兑换奖励 -->
    <div v-show="activeTab === 'exchange'" class="tab-content">
      <!-- 我创建的 -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">📦 我创建的</h3>
          <van-button size="small" type="primary" round @click="showCreate = true">
            + 新建
          </van-button>
        </div>
        <div class="reward-scroll" v-if="myRewards.length > 0">
          <div v-for="reward in myRewards" :key="reward.id" class="scroll-item">
            <RewardCard :reward="reward" @click="handleToggleReward(reward)" />
            <span class="scroll-item__status">{{ reward.enabled ? '上架中' : '已下架' }}</span>
          </div>
        </div>
        <div v-else class="empty-hint">还没有创建奖励</div>
      </div>

      <!-- 我可以兑换的（对方创建的） -->
      <div class="section">
        <h3 class="section-title">🛍️ 可以兑换的</h3>
        <div class="reward-grid" v-if="canExchange.length > 0">
          <RewardCard
            v-for="reward in canExchange"
            :key="reward.id"
            :reward="reward"
            @click="handleExchange(reward)"
          />
        </div>
        <div v-else class="empty-hint">对方还没有创建奖励</div>
      </div>
    </div>

    <!-- Tab 2: 兑换记录 -->
    <div v-show="activeTab === 'history'" class="tab-content">
      <!-- 待确认 -->
      <div v-if="pendingForMe.length > 0" class="section">
        <h3 class="section-title">⏳ 待确认</h3>
        <div v-for="ex in pendingForMe" :key="ex.id" class="exchange-item exchange-item--pending">
          <div class="exchange-content">
            <span class="exchange-icon">⏳</span>
            <div class="exchange-info">
              <div class="exchange-title">
                {{ getUserName(ex.userId) }}想兑换「{{ getRewardById(ex.rewardId)?.title ?? '未知奖励' }}」
              </div>
              <div class="exchange-time">{{ new Date(ex.createdAt).toLocaleString('zh-CN') }}</div>
            </div>
          </div>
          <div class="exchange-actions">
            <van-button size="small" type="primary" round @click="handleConfirm(ex)">确认</van-button>
            <van-button size="small" round @click="handleCancel(ex)">拒绝</van-button>
          </div>
        </div>
      </div>

      <!-- 我发起的 -->
      <div v-if="myRequests.length > 0" class="section">
        <h3 class="section-title">📤 我发起的</h3>
        <div v-for="ex in myRequests" :key="ex.id" class="exchange-item">
          <div class="exchange-content">
            <span class="exchange-icon">{{ ex.status === 'done' ? '✅' : ex.status === 'cancelled' ? '❌' : '⏳' }}</span>
            <div class="exchange-info">
              <div class="exchange-title">「{{ getRewardById(ex.rewardId)?.title ?? '未知奖励' }}」</div>
              <div class="exchange-sub">
                <span class="exchange-status">
                  {{ ex.status === 'done' ? '已兑现' : ex.status === 'cancelled' ? '已取消' : '等待确认' }}
                </span>
                <span class="exchange-time">{{ new Date(ex.createdAt).toLocaleString('zh-CN') }}</span>
              </div>
            </div>
          </div>
          <van-button
            v-if="ex.status === 'pending_confirm'"
            size="small"
            round
            @click="pointsStore.cancelExchange(ex.id)"
          >
            取消
          </van-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="pendingForMe.length === 0 && myRequests.length === 0" class="empty-hint">
        还没有兑换记录
      </div>
    </div>

    <!-- 确认兑换 ActionSheet -->
    <van-action-sheet
      v-model:show="showActionSheetPopup"
      :title="actionSheetTitle"
      :description="actionSheetDescription"
      :actions="actionSheetActions"
      :cancel-text="actionSheetCancelText"
      @select="onActionSelect"
    />

    <!-- 新建奖励弹窗 -->
    <van-popup v-model:show="showCreate" position="bottom" :style="{ padding: '20px', borderRadius: '16px 16px 0 0' }">
      <h3 class="popup-title">创建奖励</h3>
      <div class="create-form">
        <div class="form-item">
          <label>图标</label>
          <div class="icon-picker">
            <span
              v-for="icon in rewardIcons"
              :key="icon"
              class="icon-option"
              :class="{ 'icon-option--active': newIcon === icon }"
              @click="newIcon = icon"
            >{{ icon }}</span>
          </div>
        </div>
        <div class="form-item">
          <label>奖励名称</label>
          <van-field v-model="newTitle" placeholder="如：按摩10分钟" maxlength="20" />
        </div>
        <div class="form-item">
          <label>消耗积分</label>
          <van-stepper v-model="newCost" :min="5" :max="500" :step="5" />
        </div>
        <van-button type="primary" round block @click="handleCreateReward">创建奖励</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.reward-shop {
  padding-bottom: calc(var(--tabbar-height) + var(--safe-area-bottom) + 24px);
}

.tab-content {
  padding: var(--space-base);
}

.section {
  margin-bottom: var(--space-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

.section-header .section-title { margin-bottom: 0; }

/* 横向滚动奖励 */
.reward-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.scroll-item {
  flex-shrink: 0;
  width: 110px;
  text-align: center;
}

.scroll-item__status {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
  display: block;
}

/* 奖励网格 */
.reward-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* 兑换条目 */
.exchange-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  gap: 12px;
}

.exchange-item--pending {
  border-left: 3px solid #ffaa00;
}

.exchange-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.exchange-icon { font-size: 24px; flex-shrink: 0; }

.exchange-info { min-width: 0; }

.exchange-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exchange-sub {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.exchange-status {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.exchange-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.exchange-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 创建表单 */
.popup-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-align: center;
  margin-bottom: var(--space-base);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}

.form-item label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--duration-fast);
}

.icon-option--active {
  border-color: var(--color-primary);
  background: #fff;
}

.empty-hint {
  text-align: center;
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>