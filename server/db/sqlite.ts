import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import type { TemplateObject } from '../../shared/domain';

export const users = sqliteTable('User', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  username: text('Username').notNull(),
  password: text('Password').notNull(),
  role: integer('RoleType').notNull().default(0),
  lastForgetTime: text('LastForgetTime'),
  lastLoginTime: text('LastLoginTime'),
});

export const rooms = sqliteTable('Room', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  name: text('RoomName').notNull(),
  code: text('RoomCode').notNull(),
  key: text('RoomKey'),
  userId: integer('UserId').notNull(),
  createdAt: text('CreateDate').notNull(),
});

export const channels = sqliteTable('Channel', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  name: text('ChannelName').notNull(),
  type: integer('ChannelType').notNull().default(0),
  url: text('ChannelUrl').notNull(),
  proxy: text('ChannelProxyUrl'),
  userId: integer('UserId').notNull(),
  config: text('ChannelConfig'),
});

export const templates = sqliteTable('StringTemplate', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  name: text('TemplateName').notNull(),
  code: text('TemplateCode').notNull(),
  value: text('StringTemplateObject', { mode: 'json' }).$type<TemplateObject>().notNull(),
  userId: integer('UserId').notNull(),
});

export const messages = sqliteTable('Message', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  type: integer('MessageType').notNull().default(0),
  content: text('Content').notNull(),
  comment: text('Comment').notNull(),
  recordedAt: text('RecordTime').notNull(),
  roomId: integer('RoomId').notNull(),
});

export const histories = sqliteTable('ChannelMessageHistory', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  channelId: integer('ChannelId').notNull(),
  messageId: integer('MessageId').notNull(),
  status: integer('Status').notNull().default(0),
  success: integer('Success', { mode: 'boolean' }).notNull().default(false),
  result: text('Result'),
});

export const relations = sqliteTable('RoomWithChannel', {
  id: integer('Id').primaryKey({ autoIncrement: true }),
  roomId: integer('RoomId').notNull(),
  channelId: integer('ChannelId').notNull(),
});


