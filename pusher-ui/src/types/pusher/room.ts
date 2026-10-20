export enum MessageEnum {
  Text,
  Image
}

export interface CreateRoomRO {
  roomName: string
  roomCode: string
  roomKey: string
}

export interface UpdateRoomRO {
  id: number
  roomName: string
  roomCode: string
  roomKey?: string // This property is optional
}

export interface Room {
  id: number
  roomName: string
  roomCode: string
  roomKey?: string | null
  createDate: Date | null
}

export interface UpdateRoomChannelRO {
  roomId: number
  channelIds: number[]
}

export interface RoomMessageHistorySO {
  id: number
  messageType: MessageEnum
  content: string
  recordTime: Date
}
