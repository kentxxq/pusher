import type { EnumObject } from '@/types/pusher/common'
import { HttpMethod } from '@/utils/enums'
import { http } from '@/utils/request'

export function enumChannelEnumApi() {
  return http<Array<EnumObject>>({
    url: '/Enums/ChannelEnumApi',
    method: HttpMethod.GET
  })
}

export function enumRoleEnumApi() {
  return http<Array<EnumObject>>({
    url: '/Enums/RoleEnumApi',
    method: HttpMethod.GET
  })
}
