import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { BusinessError } from '../../shared/domain';

export type SendMail = (to: string, subject: string, text: string, proxy?: string | null) => Promise<void>;
export const sendMail: SendMail = async (to, subject, text, proxy) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new BusinessError('邮件服务未配置');
  const options: SMTPTransport.Options & { proxy?: string } = {
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== 'false',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    proxy: proxy || undefined, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    tls: { minVersion: 'TLSv1.2' },
  };
  const transport = nodemailer.createTransport(options);
  try { await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text }); }
  catch { throw new BusinessError('邮件发送失败，请检查邮件服务配置'); }
  finally { transport.close(); }
};
