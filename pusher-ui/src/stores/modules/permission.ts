import { asyncRoutes } from '@/router'
import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from './user'

// 判断是否有权限
function hasPermission(roles: Array<string>, route: RouteRecordRaw): boolean {
  if (route.meta && route.meta.roles) {
    const routeRoles = route.meta.roles as Array<string>
    return roles.some((role) => routeRoles.indexOf(role) >= 0)
  } else {
    return true
  }
}

// 通过角色过滤,拿到有权限的路由
function filterAsyncRoutes(
  routes: Array<RouteRecordRaw>,
  roles: Array<string>
): Array<RouteRecordRaw> {
  const res = [] as Array<RouteRecordRaw>

  // admin有全部权限
  // if (roles.indexOf('admin') !== -1) {
  //   return routes
  // }

  routes.forEach((route) => {
    if (hasPermission(roles, route)) {
      if (route.children) {
        route.children = filterAsyncRoutes(route.children, roles)
      }
      res.push(route)
    } else {
      // console.debug(route)
    }
  })

  return res
}

export interface PermissionData {
  accessedRouters: Array<RouteRecordRaw>
}

const state: PermissionData = { accessedRouters: [] }

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionData => state,
  getters: {},
  actions: {
    initRoutes() {
      const userStore = useUserStore()
      console.debug('initRoutes:', userStore.roles)
      if (userStore.roles.length === 0) {
        this.accessedRouters = []
        return
      } else {
        const routes = filterAsyncRoutes(asyncRoutes, userStore.roles)
        // 直接覆盖,以前能访问的路由就顺便清理掉
        this.accessedRouters = routes
      }
    }
  },
  persist: false
})
