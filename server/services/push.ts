import type { Actor, PushInput } from '../../shared/domain';
import { BusinessError } from '../../shared/domain';
import type { Repository } from '../db/repository';
import { equalSecret } from './auth';
import { timestamp } from '../../shared/time';
import { ChannelSender } from './channels';

import { contentText, renderTemplate } from '../template-renderer';

export class PushService {
  constructor(private readonly repo: Repository, private readonly sender: ChannelSender) {}
  async external(code: string, key: string, input: PushInput) {
    const room = await this.repo.one('rooms', { code });
    if (!room || (room.key && !equalSecret(room.key, key)) || input.messageType !== 0) return false;
    return this.deliver(room.id, input);
  }
  async owned(actor: Actor, roomId: number, input: PushInput) {
    const room = await this.repo.one('rooms', { id: roomId, userId: actor.id });
    if (!room) throw new BusinessError('房间不存在', 404);
    return this.deliver(room.id, input);
  }
  private async deliver(roomId: number, input: PushInput) {
    let content = contentText(input.content);
    if (input.templateCode) {
      const template = await this.repo.one('templates', { code: input.templateCode });
      content = template ? renderTemplate(template.value, input.content, input.extra) : '';
    }
    const messageId = await this.repo.insert('messages', { type: 0, content, comment: '', recordedAt: timestamp(), roomId });
    const relations = await this.repo.all('relations', { roomId });
    const jobs = [];
    for (const relation of relations) jobs.push({ channelId: relation.channelId, id: await this.repo.insert('histories', { channelId: relation.channelId, messageId, status: 0, success: false, result: null }) });
    for (const job of jobs) {
      const channel = await this.repo.one('channels', { id: job.channelId });
      const result = channel ? await this.sender.send(channel, content, input.extra) : { success: false, result: '管道不存在' };
      await this.repo.update('histories', job.id, { status: 1, ...result });
    }
    // 兼容旧版：接收并完成处理，不代表每条管道均发送成功。
    return true;
  }
}
