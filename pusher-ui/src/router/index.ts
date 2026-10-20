import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore, usePermissionStore } from '@/stores'
import { testRoutes } from './modules/test'
import { roomRoutes } from './modules/room'
import { channelRoutes } from './modules/channel'
import { stringTemplateRoutes } from './modules/stringTemplate'
import { userRoutes } from './modules/admin'

const constantRoutes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue')
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/pages/404/index.vue')
  },
  {
    path: '/',
    name: 'root',
    redirect: { name: 'home' },
    meta: {
      hidden: true
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/components/layouts/index.vue'),
    redirect: { name: 'home-index' },
    meta: {
      order: 100,
      icon: 'home',
      title: '主页',
      roles: ['Free', 'VIP', 'Admin']
    },
    children: [
      {
        path: '/home/index',
        name: 'home-index',
        component: () => import('@/pages/home/index.vue')
      }
    ]
  }
]

const createNewRouter = () =>
  createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: constantRoutes
  })

const router = createNewRouter()

const whiteList: Array<string> = ['/login', '/404']

// https://router.vuejs.org/zh/guide/advanced/navigation-guards.html#%E5%85%A8%E5%B1%80%E5%89%8D%E7%BD%AE%E5%AE%88%E5%8D%AB
// router.beforeEach((to, from) => { //false取消导航 return false }
router.beforeEach(async (to, from) => {
  // 如果没有meta,加上默认meta
  // if (!to.meta.roles) {
  //   to.meta.roles = ['admin', 'vip', 'free']
  // }

  const userStore = useUserStore()
  console.debug(from, 'router拦截器-准备前往', to)

  if (userStore.isTokenValid) {
    // 正常登录
    if (to.name === 'login') {
      return '/home'
    } else {
      const permissionStore = usePermissionStore()
      // permissionStore没有做持久化. 如果permissionStore.accessedRouters.length === 0 ,说明是在刷新或重新进入界面,router就需要addRoute
      console.debug('permissionStore', permissionStore.accessedRouters)
      if (permissionStore.accessedRouters.length === 0) {
        permissionStore.initRoutes()
        permissionStore.accessedRouters.forEach((item: RouteRecordRaw) => {
          router.addRoute(item)
        })
        console.debug('完成路由添加', router.getRoutes())

        // 处理后缀带有重定向的登录
        if (to.name === '404') {
          // 动态添加路由后，此处应当重定向到fullPath，否则会加载404页面内容
          return { path: to.fullPath, replace: true, query: to.query }
        } else {
          const redirect = decodeURIComponent((from.query.redirect || to.path) as string)
          console.debug('redirect', redirect, 'to.path', to.path)
          return to.path === redirect ? { ...to, replace: true } : { path: redirect }
        }
      }

      if (!router.hasRoute(to.name ?? '')) {
        console.debug(`没有这个路由${to}`)
        return '/home'
      }
    }
  } else {
    // token失效,或没有token,没有登录
    userStore.resetUser()
    // 白名单通行, 否则保留路径到query跳转login
    if (whiteList.indexOf(to.path) !== -1) {
      return
    } else {
      return {
        name: 'login',
        query: { redirect: encodeURIComponent(to.fullPath) }
      }
    }
  }
})

router.afterEach(async (to) => {
  // 修改title
  // document.title = `${to.meta.title}-${import.meta.env.VITE_APP_TITLE}`

  // 如果进入到了登录页面,就清空已添加的route
  // 并且因为没有了role,所以initRoutes后,permissionStore也变成了空的
  if (to.name === 'login') {
    const permissionStore = usePermissionStore()
    permissionStore.accessedRouters.forEach((item: RouteRecordRaw) => {
      if (item.name) {
        router.removeRoute(item.name)
      }
    })
    permissionStore.initRoutes()
  } else {
    // token自动续期
    const userStore = useUserStore()
    if (userStore.needRefreshToken()) {
      await userStore.refreshToken()
    }
  }
})

// 所有需要权限判断的路由
const asyncRoutes: Array<RouteRecordRaw> = [
  ...testRoutes,
  ...roomRoutes,
  ...channelRoutes,
  ...stringTemplateRoutes,
  ...userRoutes
]

export { constantRoutes, whiteList, asyncRoutes }

export default router
