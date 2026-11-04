import type { Actor } from '../../shared/domain';
import { BusinessError } from '../../shared/domain';
import type { Repository } from '../db/repository';
import { randomPassword, requireAdmin } from './auth';
import { timestamp, parseTimestamp } from '../../shared/time';
import type { SendMail } from './mail';
import { ManagementService, paginate } from './management';

export class UserService {
  constructor(private readonly repo: Repository, private readonly management: ManagementService, private readonly mail: SendMail) {}
  async passwordMail(username: string) {
    let user = await this.repo.one('users', { username });
    if (user?.lastForgetTime && Date.now() - parseTimestamp(user.lastForgetTime) < 600000) throw new BusinessError('10分钟内只允许发送一封邮件', 429);
    if (!user) {
      const password = randomPassword();
      const id = await this.repo.insert('users', { username, password, role: 0, lastForgetTime: timestamp(), lastLoginTime: null });
      user = (await this.repo.one('users', { id }))!;
    } else await this.repo.update('users', user.id, { lastForgetTime: timestamp() });
    await this.mail(username, 'pusher-用户注册', `欢迎注册pusher,你的用户名是${username},你的密码是${user.password}`);
  }
  async list(actor: Actor, page: number, search = '') {
    requireAdmin(actor);
    const all = (await this.repo.all('users')).map(({ password, ...user }) => user);
    const trimmed = search.trim().toLowerCase();
    const filtered = trimmed ? all.filter(u => u.username.toLowerCase().includes(trimmed)) : all;
    return paginate(filtered, page);
  }
  async create(actor: Actor, input: { username: string; password: string; role: number }) {
    requireAdmin(actor);
    if (await this.repo.one('users', { username: input.username })) throw new BusinessError('用户名已存在', 409);
    const id = await this.repo.insert('users', { ...input, lastForgetTime: null, lastLoginTime: null });
    await this.management.initDemo(id);
  }
  async role(actor: Actor, id: number, role: number) { requireAdmin(actor); if (!await this.repo.one('users', { id })) throw new BusinessError('用户不存在', 404); if (id === actor.id && role !== 100) throw new BusinessError('不能取消自己的管理员权限'); await this.repo.update('users', id, { role }); }
  async remove(actor: Actor, id: number) {
    requireAdmin(actor);
    if (id === actor.id) throw new BusinessError('不能删除当前登录账号');
    await this.deleteUser(id);
  }
  async deleteUser(id: number) {
    const user = await this.repo.one('users', { id });
    if (!user) return;
    if (!user.username.startsWith('delete_')) { await this.repo.update('users', id, { username: `delete_${user.username}` }); return; }
    await this.management.deleteUserData(id); await this.repo.remove('users', id);
  }
}
