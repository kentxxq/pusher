export const channelNames = ['钉钉', '企业微信', '飞书', 'Telegram', 'Bark', '邮箱', 'Webhook', 'Qmsg'] as const;
export const roleNames: Record<number, string> = { 0: 'Free', 1: 'VIP', 100: 'Admin' };
export interface Actor { id: number; username: string; role: number }
export interface TemplateObject {
  Variables: { VariableName: string; JsonPath: string }[];
  TemplateText: string;
}
export interface User { id: number; username: string; password: string; role: number; lastForgetTime: string | null; lastLoginTime: string | null }
export interface Room { id: number; name: string; code: string; key: string | null; userId: number; createdAt: string }
export interface Channel { id: number; name: string; type: number; url: string; proxy: string | null; userId: number; config: string | null }
export interface Template { id: number; name: string; code: string; value: TemplateObject; userId: number }
export interface Message { id: number; type: number; content: string; comment: string; recordedAt: string; roomId: number }
export interface History { id: number; channelId: number; messageId: number; status: number; success: boolean; result: string | null }
export interface Relation { id: number; roomId: number; channelId: number }
export interface Entities { users: User; rooms: Room; channels: Channel; templates: Template; messages: Message; histories: History; relations: Relation }
export type TableName = keyof Entities;
export type NewEntity<K extends TableName> = Omit<Entities[K], 'id'>;
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface PushInput { content: unknown; messageType: number; templateCode: string; extra: Record<string, string> }
export class BusinessError extends Error {
  constructor(message: string, public status: 400 | 401 | 403 | 404 | 409 | 429 = 400) { super(message); }
}
