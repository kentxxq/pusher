import { mysqlTable, int, varchar, text, datetime, boolean, customType } from 'drizzle-orm/mysql-core';
import type { TemplateObject } from '../../shared/domain';

const templateJson = customType<{ data: TemplateObject; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => typeof value === 'string' ? JSON.parse(value) : value,
});

export const users = mysqlTable('User', {
  id: int('Id').autoincrement().primaryKey(),
  username: varchar('Username', { length: 200 }).notNull(),
  password: varchar('Password', { length: 200 }).notNull(),
  role: int('RoleType').notNull().default(0),
  lastForgetTime: datetime('LastForgetTime', { mode: 'string', fsp: 3 }),
  lastLoginTime: datetime('LastLoginTime', { mode: 'string', fsp: 3 }),
});

export const rooms = mysqlTable('Room', {
  id: int('Id').autoincrement().primaryKey(),
  name: varchar('RoomName', { length: 200 }).notNull(),
  code: varchar('RoomCode', { length: 200 }).notNull(),
  key: varchar('RoomKey', { length: 200 }),
  userId: int('UserId').notNull(),
  createdAt: datetime('CreateDate', { mode: 'string', fsp: 3 }).notNull(),
});

export const channels = mysqlTable('Channel', {
  id: int('Id').autoincrement().primaryKey(),
  name: varchar('ChannelName', { length: 200 }).notNull(),
  type: int('ChannelType').notNull().default(0),
  url: varchar('ChannelUrl', { length: 200 }).notNull(),
  proxyEnabled: boolean('ProxyEnabled').notNull().default(false),
  proxyProtocol: varchar('ProxyProtocol', { length: 5 }).$type<'http' | 'https'>().notNull().default('http'),
  proxyHost: varchar('ProxyHost', { length: 200 }).notNull().default(''),
  proxyPort: int('ProxyPort').notNull().default(8080),
  proxyUsername: varchar('ProxyUsername', { length: 200 }).notNull().default(''),
  proxyPassword: varchar('ProxyPassword', { length: 200 }).notNull().default(''),
  userId: int('UserId').notNull(),
  config: text('ChannelConfig'),
});

export const templates = mysqlTable('StringTemplate', {
  id: int('Id').autoincrement().primaryKey(),
  name: varchar('TemplateName', { length: 200 }).notNull(),
  code: varchar('TemplateCode', { length: 200 }).notNull(),
  value: templateJson('StringTemplateObject').notNull(),
  userId: int('UserId').notNull(),
});

export const messages = mysqlTable('Message', {
  id: int('Id').autoincrement().primaryKey(),
  type: int('MessageType').notNull().default(0),
  content: varchar('Content', { length: 2000 }).notNull(),
  comment: varchar('Comment', { length: 200 }).notNull(),
  recordedAt: datetime('RecordTime', { mode: 'string', fsp: 3 }).notNull(),
  roomId: int('RoomId').notNull(),
});

export const histories = mysqlTable('ChannelMessageHistory', {
  id: int('Id').autoincrement().primaryKey(),
  channelId: int('ChannelId').notNull(),
  messageId: int('MessageId').notNull(),
  status: int('Status').notNull().default(0),
  success: boolean('Success').notNull().default(false),
  result: varchar('Result', { length: 200 }),
});

export const relations = mysqlTable('RoomWithChannel', {
  id: int('Id').autoincrement().primaryKey(),
  roomId: int('RoomId').notNull(),
  channelId: int('ChannelId').notNull(),
});


