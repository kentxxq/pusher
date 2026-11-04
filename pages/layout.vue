<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue';
import { Link, useForm, useRouter, useShared } from '@void/vue';
import ui from '@nuxt/ui/vue-plugin';
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui';
import type { Actor } from '../shared/domain';
import { actionErrorMessage } from '../shared/action-error';
import { createUiNavigation } from '../shared/ui-navigation';
import '../styles/main.css';
const router = useRouter();
const shared = useShared<{ actor: Actor | null; csrf: string }>();
const isLoginPage = computed(() => router.url.pathname === '/login');
const logout = useForm('/account?logout', { csrf: shared.csrf });
const open = ref(false);
watch(() => router.url.href, () => { open.value = false; });
watch(() => shared.actor?.id, () => { open.value = false; });
const links = computed<NavigationMenuItem[]>(() => {
  const path = router.url.pathname;
  const items: NavigationMenuItem[] = [
    { label: '概览', icon: 'i-lucide-house', to: '/', active: path === '/' },
    ...([
      ['/rooms', '房间', 'i-lucide-inbox'], ['/channels', '管道', 'i-lucide-radio'],
      ['/templates', '模板', 'i-lucide-layout-template'], ['/account', '账号', 'i-lucide-user-round'],
    ] as const).map(([to, label, icon]) => ({ to, label, icon, active: path === to || path.startsWith(to + '/') })),
  ];
  if (shared.actor?.role === 100) items.push({ label: '系统管理', icon: 'i-lucide-settings', type: 'trigger', defaultOpen: true, active: path.startsWith('/admin/'),
    children: ([['dashboard', '仪表盘'], ['user', '用户管理'], ['db', '数据库管理']] as const).map(([suffix, label]) => ({ label, to: '/admin/' + suffix, active: path === '/admin/' + suffix })),
  });
  return items;
});
const userItems = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: shared.actor?.username ?? '' }],
  [{ label: '账号设置', icon: 'i-lucide-user-round', to: '/account', active: router.url.pathname === '/account' }],
  [{ label: '退出登录', icon: 'i-lucide-log-out', disabled: logout.pending, onSelect: () => { logout.data.csrf = shared.csrf; return logout.post(); } }],
]);
getCurrentInstance()!.appContext.app.use(ui, { router: createUiNavigation(router, () => { open.value = false; }) });
</script>
<template>
  <UApp>
    <UDashboardGroup v-if="shared.actor && !isLoginPage" unit="rem" storage="local" :storage-options="{ initOnMounted: true }" storage-key="pusher-dashboard-layout">
      <UDashboardSidebar id="pusher-sidebar" v-model:open="open" :auto-close="false" :min-size="14" :max-size="18" :default-size="16" collapsible resizable class="bg-elevated/25" :ui="{ footer: 'lg:border-t lg:border-default' }">
        <template #header="{ collapsed }">
          <div class="flex w-full items-center" :class="collapsed ? 'justify-center' : 'gap-2'">
            <Link v-if="!collapsed" href="/" aria-label="Pusher 首页" class="min-w-0 flex-1 truncate text-xl font-bold text-highlighted">Pusher</Link>
            <UDashboardSidebarCollapse square class="shrink-0" />
          </div>
        </template>
        <template #default="{ collapsed }">
          <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" tooltip popover />
        </template>
        <template #footer="{ collapsed }">
          <UDropdownMenu :items="userItems" :content="{ align: 'center', collisionPadding: 12 }" :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
            <UButton :label="collapsed ? undefined : shared.actor.username" :aria-label="shared.actor.username + '的账号菜单'" :avatar="{ text: shared.actor.username.slice(0, 1).toUpperCase() }" :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'" color="neutral" variant="ghost" block :square="collapsed" :loading="logout.pending" class="data-[state=open]:bg-elevated" />
          </UDropdownMenu>
          <UAlert v-if="logout.error" color="error" :description="actionErrorMessage(logout.error)" />
        </template>
      </UDashboardSidebar>
      <UDashboardPanel :ui="{ body: '[scrollbar-gutter:stable]' }">
        <template #body>
          <main class="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
            <UButton class="lg:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" :aria-expanded="open" @click="open = true">菜单</UButton>
            <slot />
          </main>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
    <main v-else class="grid min-h-dvh place-items-center p-6"><slot /></main>
  </UApp>
</template>
