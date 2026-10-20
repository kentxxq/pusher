import type {
  Channel,
  ChannelJoinedRoomsSO,
  ChannelMessageHistorySO,
  CreateChannelRO,
  UpdateChannelRO
} from '@/types/pusher/channel'
import type { PageDataModel } from '@/types/pusher/common'
import { HttpMethod } from '@/utils/enums'
import { http } from '@/utils/request'

export function channelGetUserChannelsApi() {
  return http<Channel[]>({
    url: '/Channel/GetUserChannels',
    method: HttpMethod.GET
  })
}

export function channelGetUserChannelsWithPageApi(pageIndex: number, pageSize: number) {
  return http<PageDataModel<Channel>>({
    url: '/Channel/GetUserChannelsWithPage',
    method: HttpMethod.GET,
    params: { pageIndex, pageSize }
  })
}

export function channelCreateChannelApi(createChannelRO: CreateChannelRO) {
  return http<Array<Channel>>({
    url: '/Channel/CreateChannel',
    method: HttpMethod.POST,
    data: createChannelRO
  })
}

export function channelDeleteChannelApi(channelIdList: Array<number>) {
  return http<Array<Channel>>({
    url: '/Channel/DeleteChannel',
    method: HttpMethod.POST,
    data: channelIdList
  })
}

export function channelSendTestMessageToChannelApi(channelId: number) {
  return http<boolean>({
    url: '/Channel/SendTestMessageToChannel',
    method: HttpMethod.GET,
    params: { channelId }
  })
}

export function channelUpdateChannelApi(updateChannelRO: UpdateChannelRO) {
  return http<boolean>({
    url: '/Channel/UpdateChannel',
    method: HttpMethod.POST,
    data: updateChannelRO
  })
}

export function channelGetChannelJoinedRoomsApi(channelId: number) {
  return http<ChannelJoinedRoomsSO[]>({
    url: '/Channel/GetChannelJoinedRooms',
    method: HttpMethod.GET,
    params: { channelId }
  })
}

export function channelGetChannelMessageHistoryWithPageApi(
  channelId: number,
  pageIndex: number,
  pageSize: number
) {
  return http<PageDataModel<ChannelMessageHistorySO>>({
    url: '/Channel/GetChannelMessageHistoryWithPage',
    method: HttpMethod.GET,
    params: { channelId, pageIndex, pageSize }
  })
}
