<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const features = [
  {
    icon: '💝',
    title: '每日签到',
    desc: '点击"今天也想你"按钮签到，记录你们的连续签到天数。签到后日历上对应日期会出现小绿点。',
  },
  {
    icon: '💌',
    title: '贴纸传情',
    desc: '发送可爱的贴纸给另一半，TA 会收到通知。贴纸会飘浮在屏幕上，互动动态也会记录。',
  },
  {
    icon: '📝',
    title: '心愿墙',
    desc: '创建心愿让 TA 来接单，也可以接单 TA 的心愿。心愿有四种状态：待响应 → 进行中 → 已完成。',
  },
  {
    icon: '📅',
    title: '甜蜜日历',
    desc: '日历上会标记签到日（绿点）、心愿日（粉点）、纪念日（黄点）、日记日（紫点）。点击日期查看详情。',
  },
  {
    icon: '📔',
    title: '共同日记',
    desc: '记录你们的日常，可以设为私密（仅自己可见）或公开（TA 也能看）。',
  },
  {
    icon: '🔗',
    title: '情侣绑定',
    desc: '一方生成 6 位邀请码 → 另一方输入 → 绑定成功！绑定后所有数据共享。',
  },
  {
    icon: '🪙',
    title: '积分系统',
    desc: '签到、完成心愿、发送贴纸都能赚积分。积分可以兑换小奖励。',
  },
];

const faqs = [
  {
    q: '为什么心愿墙是空的？',
    a: '需要先绑定另一半才能使用心愿功能。去"我的 → 绑定另一半"完成绑定。',
  },
  {
    q: '签到后日历为什么没反应？',
    a: '签到后在互动页操作，切换到日历页就能看到对应日期出现绿色小圆点。',
  },
  {
    q: '退出 App 后数据还在吗？',
    a: '在的。你的数据存储在云端服务器上，重新登录后会自动恢复。互动动态也会本地缓存。',
  },
  {
    q: '怎么换主题颜色？',
    a: '去"我的 → 🎨 主题"点击切换，或在"设置"里调整更多选项。',
  },
  {
    q: '登录邮件打不开怎么办？',
    a: 'Supabase 的验证域名在国内可能被墙，需要开 VPN 点击邮件里的链接。登录后不需要 VPN。',
  },
  {
    q: '可以解绑换人吗？',
    a: '可以，去"我的 → 绑定另一半 → 解绑"。注意解绑后共享数据不再可见。',
  },
];
</script>

<template>
  <div class="about-page">
    <!-- 头部 -->
    <div class="about-hero">
      <span class="about-hero__icon">🫘</span>
      <h1 class="about-hero__title">小甜豆</h1>
      <p class="about-hero__subtitle">Sweet Bean · 情侣互动小窝</p>
      <p class="about-hero__version">v1.0</p>
    </div>

    <!-- 功能列表 -->
    <div class="about-section">
      <h2 class="about-section__title">✨ 功能指南</h2>
      <div class="feature-list">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <span class="feature-card__icon">{{ f.icon }}</span>
          <div class="feature-card__body">
            <h3 class="feature-card__title">{{ f.title }}</h3>
            <p class="feature-card__desc">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用流程 -->
    <div class="about-section">
      <h2 class="about-section__title">🚀 快速开始</h2>
      <div class="steps">
        <div class="step">
          <span class="step__num">1</span>
          <div>
            <p class="step__title">注册登录</p>
            <p class="step__desc">输入邮箱 → 点击邮件里的链接 → 设置头像和昵称</p>
          </div>
        </div>
        <div class="step">
          <span class="step__num">2</span>
          <div>
            <p class="step__title">绑定情侣</p>
            <p class="step__desc">一方创建邀请码发给另一方 → 输入邀请码完成绑定</p>
          </div>
        </div>
        <div class="step">
          <span class="step__num">3</span>
          <div>
            <p class="step__title">开始互动</p>
            <p class="step__desc">签到、发贴纸、创建心愿——享受你们的甜蜜小窝 💕</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 常见问题 -->
    <div class="about-section">
      <h2 class="about-section__title">❓ 常见问题</h2>
      <div class="faq-list">
        <details v-for="f in faqs" :key="f.q" class="faq-item">
          <summary class="faq-item__q">{{ f.q }}</summary>
          <p class="faq-item__a">{{ f.a }}</p>
        </details>
      </div>
    </div>

    <!-- 底部 -->
    <div class="about-footer">
      <p>用 💕 打造 · 为你们的每一天</p>
      <van-button round plain size="small" @click="router.back()">返回</van-button>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  padding: var(--space-base);
  padding-bottom: calc(var(--safe-area-bottom) + 24px);
  max-width: 480px;
  margin: 0 auto;
}

/* 头部 */
.about-hero {
  text-align: center;
  padding: var(--space-xl) 0;
}
.about-hero__icon { font-size: 64px; display: block; margin-bottom: var(--space-sm); }
.about-hero__title {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: 4px;
}
.about-hero__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.about-hero__version {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
  margin-top: 4px;
}

/* 分区标题 */
.about-section {
  margin-bottom: var(--space-lg);
}
.about-section__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
}

/* 功能卡片 */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  align-items: flex-start;
}
.feature-card__icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
.feature-card__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin-bottom: 2px; }
.feature-card__desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.5; }

/* 步骤 */
.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
.step__num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
.step__desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.faq-item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.faq-item__q {
  padding: 14px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.faq-item__q::after {
  content: '▾';
  font-size: 12px;
  color: var(--color-text-hint);
  transition: transform var(--duration-fast);
}
details[open] .faq-item__q::after {
  transform: rotate(180deg);
}
.faq-item__a {
  padding: 0 14px 14px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* 底部 */
.about-footer {
  text-align: center;
  padding: var(--space-xl) 0;
  color: var(--color-text-hint);
  font-size: var(--font-size-xs);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-base);
}
</style>
