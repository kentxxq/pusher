import type { RouteRecordRaw } from 'vue-router'

export const testRoutes: Array<RouteRecordRaw> = [
  {
    path: '/test',
    name: 'test',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'test-index' },
    meta: {
      title: '测试页面',
      icon: 'bug',
      roles: ['Free', 'VIP', 'Admin'],
      order: 999,
      hidden: true
    },
    children: [
      {
        path: '/test/index',
        name: 'test-index',
        component: () => import('@/pages/test/index.vue')
      }
      // {
      //   path: '/test/index2',
      //   name: 'test-index2',
      //   component: () => import('@/pages/test/index.vue')
      // }
    ]
  }
]
