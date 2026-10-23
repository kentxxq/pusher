import { randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { appConfig } from '../config';
import { BusinessError, roleNames, type Actor } from '../../shared/domain';
import type { Repository } from '../db/repository';

export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export class AuthService {
  constructor(private readonly repo: Repository) {}
  async login(username: string, password: string) {
    const user = await this.repo.one('users', { username });
    if (!user || !equalSecret(user.password, password)) throw new BusinessError('用户名或密码错误');
    await this.repo.update('users', user.id, { lastLoginTime: timestamp() });
    return this.token({ id: user.id, username: user.username, role: user.role });
  }
  async token(actor: Actor) {
    const config = appConfig();
    return new SignJWT({ jti: String(actor.id), name: actor.username, role: [roleNames[actor.role]], 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': actor.username })
      .setProtectedHeader({ alg: 'HS256' }).setSubject('Bearer').setIssuedAt().setNotBefore('0s')
      .setIssuer(config.issuer).setAudience(config.audience).setExpirationTime(`${config.days}d`).sign(config.key);
  }
  async authenticate(token: string | undefined): Promise<Actor | null> {
    if (!token) return null;
    try {
      const config = appConfig();
      const { payload } = await jwtVerify(token, config.key, { issuer: config.issuer, audience: config.audience, algorithms: ['HS256'] });
      const user = await this.repo.one('users', { username: String(payload.name || '') });
      if (!user || String(user.id) !== String(payload.jti)) return null;
      return { id: user.id, username: user.username, role: user.role };
    } catch { return null; }
  }
  async changePassword(actor: Actor, oldPassword: string, newPassword: string) {
    const user = await this.repo.one('users', { id: actor.id });
    if (!user || !equalSecret(user.password, oldPassword)) throw new BusinessError('原密码不正确');
    await this.repo.update('users', user.id, { password: newPassword });
  }
}

export function timestamp(date = new Date()) { return date.toISOString().replace('T', ' ').replace('Z', ''); }
export function randomPassword() { return randomBytes(9).toString('base64url'); }
export function requireAdmin(actor: Actor) { if (actor.role !== 100) throw new BusinessError('需要管理员权限', 403); }
