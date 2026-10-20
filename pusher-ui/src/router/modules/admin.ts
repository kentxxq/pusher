import type { RouteRecordRaw } from 'vue-router'

export const userRoutes: Array<RouteRecordRaw> = [
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'user-index' },
    meta: {
      title: '后台管理',
      roles: ['Admin'],
      order: 104,
      icon: 'user'
    },
    children: [
      {
        path: '/admin/dashboard',
        name: 'dashboard-index',
        component: () => import('@/pages/admin/dashboard/index.vue'),
        meta: {
          title: '仪表盘',
          order: 1,
          icon: 'dashboard'
        }
      },
      {
        path: '/admin/user',
        name: 'user-index',
        component: () => import('@/pages/admin/user/index.vue'),
        meta: {
          title: '用户管理',
          order: 2,
          icon: 'user'
        }
      },
      {
        path: '/admin/db',
        name: 'db-index',
        component: () => import('@/pages/admin/db/index.vue'),
        meta: {
          title: '数据库管理',
          order: 3,
          icon: 'db'
        }
      }
    ]
  }
]
