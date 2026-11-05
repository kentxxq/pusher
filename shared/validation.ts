import { z } from 'zod';
import { proxyFields } from './proxy';

const name = z.string().trim().min(1, '不能为空').max(200);
export const idSchema = z.object({ id: z.coerce.number().int().positive() });
export const loginSchema = z.object({ username: name, password: z.string().min(1) });
export const mailSchema = z.object({ username: z.email() });
export const passwordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(1).max(200) });
export const roomSchema = z.object({ id: z.number().int().nonnegative().default(0), name, code: z.string().max(200).default(''), key: z.string().max(200).default('') });
export const channelSchema = z.object({ id: z.number().int().nonnegative().default(0), name, type: z.number().int().min(0).max(7), url: z.string().max(200).default(''), ...proxyFields, config: z.string().default(''), resetConfig: z.boolean().default(false) });
export const templateValueSchema = z.object({ Variables: z.array(z.object({ VariableName: name, JsonPath: z.string().min(1) })), TemplateText: z.string() });
export const templateSchema = z.object({ id: z.number().int().nonnegative().default(0), name, code: z.string().max(200).default(''), value: z.string().min(1) });
export const templatePreviewSchema = z.object({ value: z.string().min(1), sample: z.string(), page: z.number().int().positive().default(1), search: z.string().default('') });
export const relationSchema = z.object({ id: z.number().int().positive(), channelIds: z.array(z.number().int().positive()) });
export const channelRoomsSchema = z.object({ id: z.number().int().positive(), roomIds: z.array(z.number().int().positive()) });
export const sendSchema = z.object({ id: z.number().int().positive(), content: z.string().min(1).max(2000), templateCode: z.string().default('') });
export const createUserSchema = z.object({ username: name, password: z.string().min(1).max(200), role: z.union([z.literal(0), z.literal(1), z.literal(100)]) });
export const roleSchema = z.object({ id: z.number().int().positive(), role: z.union([z.literal(0), z.literal(1), z.literal(100)]) });
export const resetSchema = z.object({ confirmation: z.literal('RESET') });
