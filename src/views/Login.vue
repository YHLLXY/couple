<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/modules/user/store';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const email = ref('');
const sent = ref(false);
const sending = ref(false);

async function handleLogin() {
  if (!email.value || !email.value.includes('@')) {
    showToast('请输入有效的邮箱地址');
    return;
  }
  sending.value = true;
  const { success, error } = await userStore.sendMagicLink(email.value.trim());
  sending.value = false;
  if (success) {
    sent.value = true;
  } else {
    showToast(error || '发送失败，请重试');
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-icon">🫘</div>
      <h1 class="login-title">小甜豆</h1>
      <p class="login-subtitle">让对方知道你今天想被宠爱</p>

      <div v-if="!sent" class="login-form">
        <van-cell-group inset>
          <van-field
            v-model="email"
            type="email"
            label="邮箱"
            placeholder="输入你的邮箱"
          />
        </van-cell-group>
        <van-button
          type="primary"
          round
          block
          :loading="sending"
          loading-text="发送中..."
          class="login-btn"
          @click="handleLogin"
        >
          发送登录链接
        </van-button>
        <p class="login-hint">我们会发一封邮件到你的邮箱，点击链接即可登录，无需密码</p>
      </div>

      <div v-else class="login-sent">
        <p class="sent-icon">📧</p>
        <p class="sent-title">邮件已发送！</p>
        <p class="sent-desc">请查看 <strong>{{ email }}</strong> 的收件箱，点击链接完成登录</p>
        <van-button round plain type="primary" class="login-btn" @click="sent = false">
          换个邮箱
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-base);
  background: var(--color-bg);
}
.login-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  padding: var(--space-xl) var(--space-base);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.login-icon { font-size: 64px; margin-bottom: var(--space-sm); }
.login-title { font-size: var(--font-size-xxl); color: var(--color-text-primary); margin-bottom: 4px; }
.login-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-xl); }
.login-form { margin-top: var(--space-base); }
.login-btn { margin-top: var(--space-base); }
.login-hint { font-size: var(--font-size-xs); color: var(--color-text-light); margin-top: var(--space-sm); padding: 0 var(--space-base); }
.sent-icon { font-size: 48px; margin-bottom: var(--space-base); }
.sent-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-xs); }
.sent-desc { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-base); }
</style>