import type { DateCountSO, TypeIntValueSO } from '@/types/pusher/dashboard'
import { HttpMethod } from '@/utils/enums'
import { http } from '@/utils/request'

export function dashboardGetRecentMessageCountGroupByDayApi(days: number) {
  return http<Array<DateCountSO>>({
    url: '/Dashboard/GetRecentMessageCountGroupByDay',
    method: HttpMethod.GET,
    params: { days }
  })
}

export function dashboardGetRecentMessageCountGroupByRoomApi(days: number) {
  return http<Array<TypeIntValueSO>>({
    url: '/Dashboard/GetRecentMessageCountGroupByRoom',
    method: HttpMethod.GET,
    params: { days }
  })
}

export function dashboardGetRecentMessageCountGroupByChannelApi(days: number) {
  return http<Array<TypeIntValueSO>>({
    url: '/Dashboard/GetRecentMessageCountGroupByChannel',
    method: HttpMethod.GET,
    params: { days }
  })
}
