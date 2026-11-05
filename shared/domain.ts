import type { ProxySettings } from './proxy';
import type { ChannelOptions } from './channels';

export const channelNames = ['钉钉', '企业微信', '飞书', 'Telegram', 'Bark', '邮箱', 'Webhook', 'Qmsg'] as const;

export const channelStyles: Record<number, { badgeClass: string; dotClass: string }> = {
  0: { // 钉钉: 经典钴蓝
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
    dotClass: 'bg-blue-500'
  },
  1: { // 企业微信: 经典靛蓝
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
    dotClass: 'bg-indigo-500'
  },
  2: { // 飞书: 飞书青绿
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30',
    dotClass: 'bg-teal-500'
  },
  3: { // Telegram: 纸飞机天蓝
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
    dotClass: 'bg-sky-500'
  },
  4: { // Bark: iOS 暖橙
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
    dotClass: 'bg-orange-500'
  },
  5: { // 邮箱: 商务紫
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    dotClass: 'bg-purple-500'
  },
  6: { // Webhook: 极客翡翠绿
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    dotClass: 'bg-emerald-500'
  },
  7: { // Qmsg: QQ 玫瑰红
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
    dotClass: 'bg-rose-500'
  }
};

export const defaultChannelStyle = {
  badgeClass: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border border-neutral-500/30',
  dotClass: 'bg-neutral-500'
};
export const roleNames: Record<number, string> = { 0: 'Free', 1: 'VIP', 100: 'Admin' };
export interface Actor { id: number; username: string; role: number }
export interface TemplateObject {
  Variables: { VariableName: string; JsonPath: string }[];
  TemplateText: string;
}
export interface User { id: number; username: string; password: string; role: number; lastForgetTime: string | null; lastLoginTime: string | null }
export interface Room { id: number; name: string; code: string; key: string | null; userId: number; createdAt: string }
export interface Channel extends ProxySettings { id: number; name: string; type: number; url: string; userId: number; config: string | null }
export interface Template { id: number; name: string; code: string; value: TemplateObject; userId: number }
export interface Message { id: number; type: number; content: string; comment: string; recordedAt: string; roomId: number }
export interface History { id: number; channelId: number; messageId: number; status: number; success: boolean; result: string | null }
export interface Relation { id: number; roomId: number; channelId: number }
export interface Entities { users: User; rooms: Room; channels: Channel; templates: Template; messages: Message; histories: History; relations: Relation }
export type TableName = keyof Entities;
export type NewEntity<K extends TableName> = Omit<Entities[K], 'id'>;
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface PushInput {
  content: unknown;
  messageType: number;
  templateCode: string;
  channelOptions?: ChannelOptions;
  /** 旧内部调用的空占位，不再参与透传、模板或发送。 */
  extra: Record<string, string>;
}
export class BusinessError extends Error {
  constructor(message: string, public status: 400 | 401 | 403 | 404 | 409 | 429 = 400) { super(message); }
}
