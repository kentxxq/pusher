import type { PageDataModel } from '@/types/pusher/common'
import type { DateCountSO, TypeIntValueSO } from '@/types/pusher/dashboard'
import type { CreateUserRO, UpdateUserRoleRO, User } from '@/types/pusher/user'
import { HttpMethod } from '@/utils/enums'
import { http } from '@/utils/request'

export function adminResetDatabaseApi() {
  return http<string>({
    url: '/Admin/ResetDatabase',
    method: HttpMethod.GET
  })
}

export function adminResetSystemStringTemplatesApi() {
  return http<string>({
    url: '/Admin/ResetSystemStringTemplates',
    method: HttpMethod.GET
  })
}

export function adminGetUsersWithPageApi(pageIndex: number, pageSize: number) {
  return http<PageDataModel<User>>({
    url: '/Admin/GetUsersWithPage',
    method: HttpMethod.GET,
    params: { pageIndex, pageSize }
  })
}

export function adminUpdateUserRoleApi(updateUserRoleRO: UpdateUserRoleRO) {
  return http<string>({
    url: '/Admin/UpdateUserRole',
    method: HttpMethod.POST,
    data: updateUserRoleRO
  })
}

export function adminCreateUserApi(createUserRO: CreateUserRO) {
  return http<number>({
    url: '/Admin/CreateUser',
    method: HttpMethod.POST,
    data: createUserRO
  })
}

export function adminDeleteUserApi(userIdList: Array<number>) {
  return http<number>({
    url: '/Admin/DeleteUser',
    method: HttpMethod.POST,
    data: userIdList
  })
}

export function adminGetRecentMessageCountGroupByDayApi(days: number) {
  return http<Array<DateCountSO>>({
    url: '/Admin/GetRecentMessageCountGroupByDay',
    method: HttpMethod.GET,
    params: { days }
  })
}

export function adminGetRecentMessageCountGroupByUserApi(days: number) {
  return http<Array<TypeIntValueSO>>({
    url: '/Admin/GetRecentMessageCountGroupByUser',
    method: HttpMethod.GET,
    params: { days }
  })
}

export function adminGetChannelCountGroupByChannelTypeApi() {
  return http<Array<TypeIntValueSO>>({
    url: '/Admin/GetChannelCountGroupByChannelType',
    method: HttpMethod.GET
  })
}
