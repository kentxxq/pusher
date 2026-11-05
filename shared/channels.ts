import { z } from 'zod';

export const channelKeys = ['dingtalk', 'wecom', 'feishu', 'telegram', 'bark', 'mail', 'webhook', 'qmsg'] as const;
export type ChannelKey = typeof channelKeys[number];
export type ChannelOptions = Partial<Record<ChannelKey, Record<string, unknown>>>;
export const channelOptionsSchema = z.partialRecord(z.enum(channelKeys), z.record(z.string(), z.unknown()));
export const encryptionModes = ['None', 'AES128CBC', 'AES128ECB', 'AES256CBC', 'AES256ECB'] as const;
export interface ChannelField { key: string; label: string; kind: 'string' | 'number' | 'boolean' | 'secret' | 'choice'; values?: readonly string[] }
// 仅包含可公开的表单元数据，校验和协议处理留在服务端适配器。
export const channelFields: Record<ChannelKey, ChannelField[]> = {
  dingtalk: [{ key: 'signingSecret', label: '签名密钥', kind: 'secret' }],
  wecom: [],
  feishu: [{ key: 'signingSecret', label: '签名密钥', kind: 'secret' }],
  telegram: [],
  bark: [
    { key: 'encryptionMode', label: '加密模式', kind: 'choice', values: encryptionModes },
    { key: 'encryptionKey', label: '加密密钥', kind: 'secret' },
    { key: 'encryptionIv', label: '固定 IV', kind: 'secret' },
  ],
  mail: [], webhook: [], qmsg: [],
};
export const messageFields: Record<ChannelKey, ChannelField[]> = {
  dingtalk: [], wecom: [], feishu: [], webhook: [], qmsg: [],
  mail: [{ key: 'subject', label: '邮件标题', kind: 'string' }],
  telegram: [
    { key: 'parse_mode', label: '解析模式', kind: 'choice', values: ['HTML', 'Markdown', 'MarkdownV2'] },
    { key: 'disable_notification', label: '静默通知', kind: 'boolean' },
    { key: 'protect_content', label: '保护内容', kind: 'boolean' },
    { key: 'disable_web_page_preview', label: '禁用链接预览', kind: 'boolean' },
  ],
  bark: [
    ...['title', 'subtitle', 'group', 'icon', 'sound', 'url', 'copy'].map(key => ({ key, label: ({ title: '标题', subtitle: '副标题', group: '分组', icon: '图标', sound: '铃声', url: '跳转地址', copy: '复制内容' } as Record<string, string>)[key]!, kind: 'string' as const })),
    { key: 'level', label: '通知级别', kind: 'choice', values: ['active', 'timeSensitive', 'passive', 'critical'] },
    ...['badge', 'volume', 'isarchive', 'autocopy'].map(key => ({ key, label: ({ badge: '角标', volume: '音量', isarchive: '归档（0/1）', autocopy: '自动复制（0/1）' } as Record<string, string>)[key]!, kind: 'number' as const })),
  ],
};
