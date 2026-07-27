import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from './types';
import { supabase } from '@/lib/supabase';

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const useUserStore = defineStore('user', () => {
  // === 状态 ===
  const currentUser = ref<User | null>(null);
  const partner = ref<User | null>(null);
  const coupleId = ref<string | null>(null);
  const inviteCode = ref<string>('');
  const loading = ref(false);

  // === 计算属性 ===
  const currentUserId = computed(() => currentUser.value?.id ?? '');
  const isBound = computed(() => !!partner.value);
  const isLoggedIn = computed(() => !!currentUser.value);

  // === 登录 ===

  /** 发送 Magic Link 登录邮件 */
  async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/#/auth-callback',
      },
    });
    loading.value = false;
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /** 登出 */
  async function logout() {
    await supabase.auth.signOut();
    currentUser.value = null;
    partner.value = null;
    coupleId.value = null;
    inviteCode.value = '';
  }

  /** 初始化——检查是否已有 session */
  async function initAuth(): Promise<boolean> {
    loading.value = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id);
      loading.value = false;
      return true;
    }
    loading.value = false;
    return false;
  }

  /** 从 public.users 表加载用户资料 */
  async function loadUserProfile(uid: string) {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (!error && profile) {
      currentUser.value = {
        id: profile.id as string,
        email: profile.email as string,
        name: profile.name as string,
        avatar: profile.avatar as string,
        coupleId: (profile.couple_id as string) || null,
        createdAt: new Date(profile.created_at as string).getTime(),
      };
      coupleId.value = (profile.couple_id as string) || null;

      // 如果已绑定，加载另一半信息
      if (profile.couple_id) {
        await loadPartner(profile.couple_id as string, uid);
        // 获取绑定码
        const { data: couple } = await supabase
          .from('couples')
          .select('invite_code')
          .eq('id', profile.couple_id as string)
          .single();
        if (couple) inviteCode.value = couple.invite_code as string;
      }
    }
  }

  /** 加载另一半 */
  async function loadPartner(cid: string, myId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('couple_id', cid)
      .neq('id', myId)
      .single();

    if (!error && data) {
      partner.value = {
        id: data.id as string,
        email: data.email as string,
        name: data.name as string,
        avatar: data.avatar as string,
        coupleId: (data.couple_id as string) || null,
        createdAt: new Date(data.created_at as string).getTime(),
      };
    }
  }

  // === 绑定 ===

  /** 注册用户信息（第一次登录后调用） */
  async function registerUser(email: string, name: string, avatar: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const uid = session.user.id;
    const { error } = await supabase.from('users').upsert({
      id: uid,
      email,
      name,
      avatar,
    });

    if (error) {
      console.error('[User] Failed to register:', error.message);
      return false;
    }

    await loadUserProfile(uid);
    return true;
  }

  /** 生成绑定码（自己是先注册的一方） */
  async function generateInviteCode(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return '';

    // 创建 couple
    const code = genCode();
    const { data: coupleRow, error } = await supabase
      .from('couples')
      .insert({ invite_code: code })
      .select()
      .single();

    if (error || !coupleRow) {
      console.error('[User] Failed to create couple:', error?.message);
      return '';
    }

    // 更新当前用户的 couple_id
    await supabase
      .from('users')
      .update({ couple_id: coupleRow.id as string })
      .eq('id', session.user.id);

    inviteCode.value = code;
    coupleId.value = coupleRow.id as string;

    if (currentUser.value) {
      currentUser.value.coupleId = coupleRow.id as string;
    }

    return code;
  }

  /** 通过绑定码加入（自己是后注册的一方） */
  async function bindByCode(code: string): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: '未登录' };

    // 查找 couple
    const { data: coupleRow, error } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (error || !coupleRow) {
      return { success: false, error: '绑定码无效，请检查' };
    }

    // 更新当前用户的 couple_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ couple_id: coupleRow.id as string })
      .eq('id', session.user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    coupleId.value = coupleRow.id as string;
    inviteCode.value = code;

    if (currentUser.value) {
      currentUser.value.coupleId = coupleRow.id as string;
    }

    // 加载另一半信息
    await loadPartner(coupleRow.id as string, session.user.id);

    return { success: true };
  }

  /** 解绑 */
  async function unbind(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('users')
      .update({ couple_id: null })
      .eq('id', session.user.id);

    partner.value = null;
    coupleId.value = null;
    inviteCode.value = '';

    if (currentUser.value) {
      currentUser.value.coupleId = null;
    }
  }

  return {
    currentUser, partner, coupleId, inviteCode, loading,
    currentUserId, isBound, isLoggedIn,
    sendMagicLink, logout, initAuth, loadUserProfile,
    registerUser, generateInviteCode, bindByCode, unbind,
  };
});