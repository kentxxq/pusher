import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import type * as mysql from './mysql';
import type * as sqlite from './sqlite';

type Tables = Pick<typeof mysql, 'rooms' | 'channels' | 'users' | 'messages' | 'histories'> | Pick<typeof sqlite, 'rooms' | 'channels' | 'users' | 'messages' | 'histories'>;
type Group = { name: string; count: number }[];
export interface Statistics {
  roomCount: number; channelCount: number; messageCount: number; failureCount: number;
  byDay: Group; byRoom: Group; byChannel: Group; byUser: Group; byChannelType: Group;
}
export type StatisticsReader = (since: string, userId?: number) => Promise<Statistics>;

// 两种方言共用统计口径，仅返回计数和分组结果，不读取消息正文或凭据。
export function createStatisticsReader(tables: Tables, execute: (query: SQL) => Promise<Record<string, unknown>[]>, dialect: 'mysql' | 'sqlite'): StatisticsReader {
  const { rooms, channels, users, messages, histories } = tables;
  const total = async (source: SQL, where: SQL) => Number((await execute(sql`select count(*) as count ${source} where ${where}`))[0]!.count);
  const group = async (name: SQLWrapper, source: SQL, where: SQL, order: SQL): Promise<Group> => {
    // MySQL 默认排序规则可能忽略大小写；分组保持原先 JavaScript 字符串键的精确匹配。
    const key = dialect === 'mysql' ? sql`binary ${name}` : name;
    const rows = await execute(sql`select min(${name}) as name, count(*) as count ${source} where ${where} group by ${key} order by ${order}`);
    return rows.map(row => ({ name: String(row.name), count: Number(row.count) }));
  };
  return async (since, userId) => {
    const owner = userId === undefined ? sql`1 = 1` : sql`${rooms.userId} = ${userId}`;
    const channelOwner = userId === undefined ? sql`1 = 1` : sql`${channels.userId} = ${userId}`;
    const period = sql`${owner} and ${messages.recordedAt} >= ${since}`;
    const messageSource = sql`from ${messages} inner join ${rooms} on ${messages.roomId} = ${rooms.id}`;
    const historySource = sql`from ${histories} inner join ${messages} on ${histories.messageId} = ${messages.id} inner join ${rooms} on ${messages.roomId} = ${rooms.id}`;
    const day = sql`substr(${messages.recordedAt}, 1, 10)`;
    const [roomCount, channelCount, messageCount, failureCount, byDay, byRoom, byChannel, byUser, byChannelType] = await Promise.all([
      total(sql`from ${rooms}`, owner),
      total(sql`from ${channels}`, channelOwner),
      total(messageSource, period),
      total(historySource, sql`${period} and ${histories.success} = 0`),
      group(day, messageSource, period, sql`min(${day}) asc`),
      group(rooms.name, messageSource, period, sql`max(${messages.id}) desc`),
      group(sql`coalesce(${channels.name}, '已删除管道')`, sql`${historySource} left join ${channels} on ${histories.channelId} = ${channels.id} and ${channelOwner}`, period, sql`max(${histories.id}) desc`),
      group(sql`coalesce(${users.username}, '已删除用户')`, sql`${messageSource} left join ${users} on ${rooms.userId} = ${users.id}`, period, sql`max(${messages.id}) desc`),
      group(channels.type, sql`from ${channels}`, channelOwner, sql`max(${channels.id}) desc`),
    ]);
    return { roomCount, channelCount, messageCount, failureCount, byDay, byRoom, byChannel, byUser, byChannelType };
  };
}
