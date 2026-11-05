import { z } from 'zod';
import { logger } from 'void/log';
import { BusinessError, type Actor, type TemplateObject } from '../../shared/domain';
import type { Repository } from '../db/repository';
import { requireAdmin } from './auth';
import { timestamp, parseTimestamp } from '../../shared/time';
import { ManagementService } from './management';
import { UserService } from './users';

const systemTemplates: Record<string, [string, string]> = { Base: ['基础模板', '$.content'], Lark: ['飞书', '$.content.text'], DingTalk: ['钉钉', '$.text.content'], ComWechat: ['企业微信', '$.text.content'] };
export class SystemService {
  constructor(private readonly repo: Repository, private readonly management: ManagementService, private readonly users: UserService) {}
  async initialize() {
    const invalidConfigs = await this.management.migrateChannelConfigs();
    if (invalidConfigs) logger.warn('存在无法迁移的渠道配置，请在渠道页面重新配置', { count: invalidConfigs });
    let admin = (await this.repo.all('users')).find(u => u.role === 100 && !u.username.startsWith('delete_'));
    if (!admin) {
      const username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD;
      if (!username || !password) throw new BusinessError('首次初始化需要 ADMIN_USERNAME 和 ADMIN_PASSWORD');
      const existing = await this.repo.one('users', { username });
      if (existing) throw new BusinessError('初始化账号已存在但不是管理员，请人工核对');
      const id = await this.repo.insert('users', { username, password, role: 100, lastForgetTime: null, lastLoginTime: timestamp() });
      admin = (await this.repo.one('users', { id }))!;
    }
    for (const [code, [name, path]] of Object.entries(systemTemplates)) {
      if (await this.repo.one('templates', { code })) continue;
      await this.repo.insert('templates', { name, code, userId: admin.id, value: this.templateValue(path) });
    }
  }
  private templateValue(path: string): TemplateObject {
    const variable = path === '$.content' || path === '$.text.content' ? 'content' : 'text';
    return { Variables: [{ VariableName: variable, JsonPath: path }], TemplateText: `{{ ${variable} }}` };
  }
  async resetTemplates(actor: Actor) {
    requireAdmin(actor);
    for (const row of await this.repo.all('templates')) if (Object.hasOwn(systemTemplates, row.code)) await this.repo.remove('templates', row.id);
    await this.initialize();
  }
  async stats(actor: Actor, days = 7, global = false) {
    if (global) requireAdmin(actor);
    const since = timestamp(new Date(Date.now() - days * 86400000));
    return this.repo.statistics(since, global ? undefined : actor.id);
  }
  async clean() {
    for (const user of await this.repo.all('users')) if (user.lastLoginTime === null && user.role !== 100) await this.users.deleteUser(user.id);
    const demo = await this.repo.one('users', { username: process.env.DEMO_USERNAME || 'test' });
    if (demo && demo.role !== 100) { await this.management.deleteUserData(demo.id); await this.management.initDemo(demo.id); }
    const retention = z.coerce.number().int().nonnegative().default(30).parse(process.env.MESSAGE_RETENTION_DAYS);
    for (const message of await this.repo.all('messages')) {
      if (Math.floor((Date.now() - parseTimestamp(message.recordedAt)) / 86400000) <= retention) continue;
      for (const history of await this.repo.all('histories', { messageId: message.id })) await this.repo.remove('histories', history.id);
      await this.repo.remove('messages', message.id);
    }
  }
}
