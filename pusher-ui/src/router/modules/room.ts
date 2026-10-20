import type { RouteRecordRaw } from 'vue-router'

export const roomRoutes: Array<RouteRecordRaw> = [
  {
    path: '/room',
    name: 'room',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'room-index' },
    meta: {
      title: '房间管理',
      roles: ['Free', 'VIP', 'Admin'],
      order: 101,
      icon: 'arrowright'
    },
    children: [
      {
        path: '/room/index',
        name: 'room-index',
        component: () => import('@/pages/room/index.vue')
      }
    ]
  }
]
