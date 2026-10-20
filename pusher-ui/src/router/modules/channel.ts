import type { RouteRecordRaw } from 'vue-router'

export const channelRoutes: Array<RouteRecordRaw> = [
  {
    path: '/channel',
    name: 'channel',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'channel-index' },
    meta: {
      title: '管道配置',
      roles: ['Free', 'VIP', 'Admin'],
      order: 102,
      icon: 'channel'
    },
    children: [
      {
        path: '/channel/index',
        name: 'channel-index',
        component: () => import('@/pages/channel/index.vue')
      }
    ]
  }
]
