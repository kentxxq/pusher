// export interface MenuMeta {
//   title: string
//   hidden: boolean
//   icon: string
//   roles: Array<string>
//   order: number
// }

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    // 图标,可以没有图标
    icon?: string
    // 标题,可以没有标题,用name替代
    title?: string
    // 权限,可以没有权限字段,那么允许所有人访问
    roles?: Array<string>
    // 隐藏,可以设置为隐藏
    hidden?: boolean
    // 排序,路由的顺序
    order?: number
  }
}
