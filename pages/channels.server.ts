import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, pageNumber } from '../server/http';
import { channelSchema, idSchema, channelRoomsSchema } from '../shared/validation';

export const loader = defineHandler(async (c) => {
  const currentActor = actor(c);
  const search = c.req.query('search') || '';
  const page = pageNumber(c);
  const svc = services();
  const list = await perform(() => svc.management.channels(currentActor, page, search));
  const channelIds = list.items.map(item => item.id);

  // 关联房间映射
  const userRooms = await svc.repo.all('rooms', { userId: currentActor.id });
  const roomMap = new Map(userRooms.map(r => [r.id, r.name]));
  const relations = channelIds.length > 0 ? await svc.repo.all('relations', { channelId: channelIds }) : [];
  const channelRoomsMap: Record<number, Array<{ id: number; name: string }>> = {};
  for (const item of list.items) channelRoomsMap[item.id] = [];
  for (const rel of relations) {
    if (!channelRoomsMap[rel.channelId]) channelRoomsMap[rel.channelId] = [];
    const roomName = roomMap.get(rel.roomId);
    if (roomName) channelRoomsMap[rel.channelId].push({ id: rel.roomId, name: roomName });
  }

  // 发送历史记录映射
  const rawHistories = channelIds.length > 0 ? await svc.repo.all('histories', { channelId: channelIds }, { limit: 100 }) : [];
  const messageIds = [...new Set(rawHistories.map(h => h.messageId))];
  const messages = messageIds.length > 0 ? await svc.repo.all('messages', { id: messageIds }) : [];
  const messageMap = new Map(messages.map(m => [m.id, m]));

  const channelHistoriesMap: Record<number, Array<{ id: number; messageId: number; status: number; success: boolean; result: string; recordedAt: string; content: string }>> = {};
  for (const item of list.items) channelHistoriesMap[item.id] = [];
  for (const h of rawHistories) {
    if (!channelHistoriesMap[h.channelId]) channelHistoriesMap[h.channelId] = [];
    if (channelHistoriesMap[h.channelId].length < 20) {
      const msg = messageMap.get(h.messageId);
      channelHistoriesMap[h.channelId].push({
        id: h.id,
        messageId: h.messageId,
        status: h.status,
        success: h.success,
        result: h.result ?? '',
        recordedAt: msg?.recordedAt || '',
        content: msg?.content || '',
      });
    }
  }

  return {
    list,
    roomsMap: channelRoomsMap,
    allRooms: userRooms.map(r => ({ id: r.id, name: r.name, code: r.code })),
    recentHistories: channelHistoriesMap,
    csrf: c.get('shared').csrf,
    search,
  };
});

export type Props = InferProps<typeof loader>;

export const actions = {
  save: defineHandler.withValidator({ body: withCsrf(channelSchema) })(async (c, { body }) => { await perform(() => services().management.saveChannel(actor(c), body)); }),
  delete: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.remove(actor(c), 'channels', body.id)); }),
  test: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.testChannel(actor(c), body.id)); }),
  clearProxy: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.clearChannelSecret(actor(c), body.id, 'proxy')); }),
  rooms: defineHandler.withValidator({ body: withCsrf(channelRoomsSchema) })(async (c, { body }) => { await perform(() => services().management.linkRooms(actor(c), body.id, body.roomIds)); }),
};
