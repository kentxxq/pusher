import type { RouteRecordRaw } from 'vue-router'

export const stringTemplateRoutes: Array<RouteRecordRaw> = [
  {
    path: '/stringTemplate',
    name: 'stringTemplate',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'stringTemplate-index' },
    meta: {
      title: '模板配置',
      roles: ['Free', 'VIP', 'Admin'],
      order: 103,
      icon: 'template'
    },
    children: [
      {
        path: '/stringTemplate/index',
        name: 'stringTemplate-index',
        component: () => import('@/pages/stringTemplate/index.vue')
      }
    ]
  }
]
