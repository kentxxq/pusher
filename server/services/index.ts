import type { Repository } from '../db/repository';
import { openDatabase } from '../db/connection';
import { AuthService } from './auth';
import { ChannelSender } from './channels';
import { sendMail, type SendMail } from './mail';
import { ManagementService } from './management';
import { UserService } from './users';
import { PushService } from './push';
import { SystemService } from './system';

export function createServices(repo: Repository, sender = new ChannelSender(), mail: SendMail = sendMail) {
  const management = new ManagementService(repo, sender);
  const users = new UserService(repo, management, mail);
  return { repo, auth: new AuthService(repo), management, users, push: new PushService(repo, sender), system: new SystemService(repo, management, users) };
}
let instance: ReturnType<typeof createServices> | undefined;
export function services() { return instance ??= createServices(openDatabase()); }
export async function closeServices() { if (instance) { await instance.repo.close(); instance = undefined; } }
