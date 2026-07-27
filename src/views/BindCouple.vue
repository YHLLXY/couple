<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/modules/user/store';
import { showToast, showDialog } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const mode = ref<'choice' | 'create' | 'join'>('choice');
const bindCode = ref('');
const loading = ref(false);

const displayCode = computed(() => userStore.inviteCode);

async function handleCreate() {
  loading.value = true;
  const code = await userStore.generateInviteCode();
  loading.value = false;
  if (code) {
    mode.value = 'create';
  } else {
    showToast('生成失败，请重试');
  }
}

async function handleJoin() {
  if (!bindCode.value || bindCode.value.length !== 6) {
    showToast('请输入 6 位绑定码');
    return;
  }
  loading.value = true;
  const { success, error } = await userStore.bindByCode(bindCode.value.trim());
  loading.value = false;
  if (success) {
    showToast('绑定成功！💕');
    router.replace('/user');
  } else {
    showToast(error || '绑定失败');
  }
}

async function handleUnbind() {
  try {
    await showDialog({ title: '解绑确认', message: '解绑后你们的数据将不再共享，确定吗？' });
    await userStore.unbind();
    showToast('已解绑');
    mode.value = 'choice';
  } catch {
    // 取消
  }
}

function goBack() {
  if (mode.value === 'choice') {
    router.push('/user');
  } else {
    mode.value = 'choice';
  }
}
</script>

<template>
  <div class="bind-page">
    <van-nav-bar title="情侣绑定" left-arrow @click-left="goBack" />

    <!-- 选择模式 -->
    <div v-if="mode === 'choice'" class="bind-choice">
      <p class="bind-guide">和另一半绑定后，你们就可以共享心愿、日记和积分啦 💕</p>
      <van-button type="primary" round block :loading="loading" @click="handleCreate">
        创建邀请码，等 TA 来绑定
      </van-button>
      <van-button round block plain class="bind-join-btn" @click="mode = 'join'">
        输入邀请码，绑定 TA
      </van-button>
      <van-button v-if="userStore.isBound" round block plain type="danger" @click="handleUnbind">
        解绑
      </van-button>
    </div>

    <!-- 创建邀请码 -->
    <div v-else-if="mode === 'create'" class="bind-create">
      <p class="bind-tip">把下面这 6 位码发给你的另一半</p>
      <div class="bind-code-display">{{ displayCode }}</div>
      <p class="bind-tip">TA 在小甜豆里输入这个码就能绑定你</p>
      <van-button round block plain @click="mode = 'choice'">返回</van-button>
    </div>

    <!-- 输入绑定码 -->
    <div v-else-if="mode === 'join'" class="bind-join">
      <p class="bind-tip">输入另一半给你的 6 位邀请码</p>
      <van-field
        v-model="bindCode"
        label="邀请码"
        placeholder="6 位数字"
        maxlength="6"
        type="digit"
      />
      <van-button type="primary" round block :loading="loading" class="bind-submit" @click="handleJoin">
        确认绑定
      </van-button>
      <van-button round block plain @click="mode = 'choice'">返回</van-button>
    </div>
  </div>
</template>

<style scoped>
.bind-page {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: var(--space-xl);
}
.bind-choice, .bind-create, .bind-join {
  padding: var(--space-xl) var(--space-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}
.bind-guide {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.6;
  margin-bottom: var(--space-base);
}
.bind-tip {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}
.bind-code-display {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-align: center;
  letter-spacing: 12px;
  padding: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}
.bind-join-btn { margin-top: 8px; }
.bind-submit { margin-top: var(--space-base); }
</style>