import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, pageNumber } from '../server/http';
import { roomSchema, idSchema, relationSchema, sendSchema } from '../shared/validation';

export const loader = defineHandler(async (c) => {
  const currentActor = actor(c);
  const search = c.req.query('search') || '';
  const page = pageNumber(c);
  const svc = services();
  const list = await perform(() => svc.management.rooms(currentActor, page, search));
  const roomIds = list.items.map(r => r.id);

  const userChannels = (await svc.repo.all('channels', { userId: currentActor.id })).map(ch => ({ id: ch.id, name: ch.name }));
  const relations = roomIds.length > 0 ? await svc.repo.all('relations', { roomId: roomIds }) : [];
  const roomChannelsMap: Record<number, number[]> = {};
  for (const r of list.items) roomChannelsMap[r.id] = [];
  for (const rel of relations) {
    if (!roomChannelsMap[rel.roomId]) roomChannelsMap[rel.roomId] = [];
    roomChannelsMap[rel.roomId].push(rel.channelId);
  }

  const recentMessagesList = roomIds.length > 0 ? await svc.repo.all('messages', { roomId: roomIds }, { limit: 100 }) : [];
  const roomMessagesMap: Record<number, Array<{ id: number; content: string; recordedAt: string }>> = {};
  for (const r of list.items) roomMessagesMap[r.id] = [];
  for (const msg of recentMessagesList) {
    if (!roomMessagesMap[msg.roomId]) roomMessagesMap[msg.roomId] = [];
    if (roomMessagesMap[msg.roomId].length < 20) {
      roomMessagesMap[msg.roomId].push({ id: msg.id, content: msg.content, recordedAt: msg.recordedAt });
    }
  }

  return {
    list,
    channels: userChannels,
    relations: roomChannelsMap,
    recentMessages: roomMessagesMap,
    csrf: c.get('shared').csrf,
    search,
  };
});

export type Props = InferProps<typeof loader>;

export const actions = {
  save: defineHandler.withValidator({ body: withCsrf(roomSchema) })(async (c, { body }) => { await perform(() => services().management.saveRoom(actor(c), body)); }),
  delete: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.remove(actor(c), 'rooms', body.id)); }),
  channels: defineHandler.withValidator({ body: withCsrf(relationSchema) })(async (c, { body }) => { await perform(() => services().management.linkChannels(actor(c), body.id, body.channelIds)); }),
  send: defineHandler.withValidator({ body: withCsrf(sendSchema) })(async (c, { body }) => { await perform(() => services().push.owned(actor(c), body.id, { content: body.content, templateCode: body.templateCode, messageType: 0, extra: {} })); }),
  clearKey: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.clearRoomKey(actor(c), body.id)); }),
};
