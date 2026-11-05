import { describe, expect, it, vi } from 'vitest';
import { createDecipheriv } from 'node:crypto';
import { ChannelSender, encryptBark, type OutboundRequest } from '../server/services/channels';
import { renderTemplate } from '../server/template-renderer';
import { getInput, postInput } from '../server/push-http';
import { disabledProxy } from '../shared/proxy';
import type { Channel } from '../shared/domain';

const channel: Channel = { id: 1, name: 'fake_info', type: 0, url: 'https://example.invalid/send?chatId=42&message_thread_id=7', ...disabledProxy, proxyEnabled: true, proxyHost: 'localhost', proxyPort: 8080, proxyUsername: 'fake_user', proxyPassword: 'fake_password', config: '', userId: 1 };
describe('八种管道', () => {
  it.each([0, 1, 2, 3, 4, 6, 7])('管道 %s 的载荷和代理', async type => {
    const transport = vi.fn(async (_request: OutboundRequest) => ({ ok: true, text: type === 7 ? '{"success":true}' : '{"errcode":0,"code":0}' }));
    const sender = new ChannelSender(transport);
    expect((await sender.send({ ...channel, type }, '中文\n消息', type === 4 ? { title: '标题' } : type === 3 ? { disable_notification: true } : {})).success).toBe(true);
    const request = transport.mock.calls[0]?.[0];
    // 通过 mock.calls 检查实际外发参数，不进行网络请求。
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ proxy: 'http://fake_user:fake_password@localhost:8080/' }));
    const payload = type === 6 ? '中文\n消息' : JSON.parse(transport.mock.calls[0]![0]!.body);
    if (type <= 1) expect(payload).toEqual({ msgtype: 'text', text: { content: '中文\n消息' } });
    if (type === 2) expect(payload).toEqual({ msg_type: 'text', content: { text: '中文\n消息' } });
    if (type === 3) { expect(payload.chat_id).toBe('42'); expect(payload.message_thread_id).toBe('7'); expect(request?.url).not.toContain('?'); expect(payload.disable_notification).toBe(true); }
    if (type === 4) expect(payload.title).toBe('标题');
    if (type === 7) expect(payload.msg).toBe('中文\n消息');
  });
  it('邮箱管道使用邮件服务并传递代理', async () => {
    const mail = vi.fn(async () => {});
    expect((await new ChannelSender(undefined, mail).send({ ...channel, type: 5 }, '正文')).success).toBe(true);
    expect(mail).toHaveBeenCalledWith(channel.url, 'pusher', '正文', 'http://fake_user:fake_password@localhost:8080/');
  });
  it('保留业务失败判断并隐藏网络错误中的凭据', async () => {
    const sender = new ChannelSender(async () => ({ ok: true, text: '{"errcode":1,"errmsg":"发送失败"}' }));
    expect((await sender.send(channel, 'x')).success).toBe(false);
    const broken = new ChannelSender(async () => { throw new Error(channel.proxyPassword); });
    expect((await broken.send(channel, 'x')).result).not.toContain('fake_password');
  });
  it.each([0, 1, 2, 7])('管道 %s 不将失败 HTTP 或缺失业务状态视为成功', async type => {
    const body = type === 7 ? '{"success":true}' : '{"errcode":0,"code":0}';
    const failedHttp = new ChannelSender(async () => ({ ok: false, text: body }));
    expect((await failedHttp.send({ ...channel, type }, '正文')).success).toBe(false);
    const missing = new ChannelSender(async () => ({ ok: true, text: '{}' }));
    expect((await missing.send({ ...channel, type }, '正文')).success).toBe(false);
  });
  it('第三方失败文本不能泄漏凭据或超出历史字段长度', async () => {
    const sender = new ChannelSender(async () => ({ ok: true, text: JSON.stringify({ errcode: 1, errmsg: channel.url + channel.proxyPassword + 'fake_secret'.repeat(100) }) }));
    const result = await sender.send(channel, '正文');
    expect(result.success).toBe(false);
    expect(result.result).not.toContain('fake_');
    expect(result.result!.length).toBeLessThanOrEqual(200);
  });
  it('Bark 加密配置无效时拒绝发送，不能回退明文', async () => {
    expect(() => encryptBark('正文', { encryptionMode: 'AES128CBC' })).toThrow();
    expect(() => encryptBark('正文', { encryptionMode: 'AES256CBC', encryptionKey: 'fake_key' })).toThrow();
    const transport = vi.fn(async () => ({ ok: true, text: '{}' }));
    const result = await new ChannelSender(transport).send({ ...channel, type: 4, config: '{"encryptionMode":"AES128CBC"}' }, '正文');
    expect(result.success).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
  it.each(['AES128CBC', 'AES128ECB', 'AES256CBC', 'AES256ECB'] as const)('Bark %s 加密', mode => {
    const key = 'x'.repeat(mode.includes('128') ? 16 : 32), iv = 'y'.repeat(16);
    const encrypted = encryptBark('中文正文', { encryptionMode: mode, encryptionKey: key, encryptionIv: iv });
    const decipher = createDecipheriv(`aes-${mode.includes('128') ? 128 : 256}-${mode.endsWith('CBC') ? 'cbc' : 'ecb'}`, Buffer.from(key), mode.endsWith('CBC') ? Buffer.from(iv) : null);
    expect(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString()).toBe('中文正文');
  });
});
describe('渠道专属参数及模板', () => {
  it('GET 点号参数拒绝重复，POST 对象保留参数类型', () => {
    expect(getInput(new URLSearchParams('content=a&channelOptions.bark.title=标题&channelOptions.bark.badge=3')).channelOptions).toEqual({ bark: { title: '标题', badge: '3' } });
    expect(() => getInput(new URLSearchParams('content=a&channelOptions.bark.title=x&channelOptions.bark.title=y'))).toThrow('不能重复');
    const input = postInput(new URLSearchParams('title=url&secret=fake_secret&messageType=Text'), { content: '正文', channelOptions: { bark: { title: 'body', badge: 3 }, telegram: { disable_notification: false } } });
    expect(input).toMatchObject({ content: '正文', messageType: 0, channelOptions: { bark: { title: 'body', badge: 3 }, telegram: { disable_notification: false } } });
    expect(() => getInput(new URLSearchParams())).toThrow();
    expect(() => postInput(new URLSearchParams('messageType=other'), {})).toThrow();
  });
  it('GET 保留参数与旧平铺字段不进入渠道专属参数', () => {
    const input = getInput(new URLSearchParams('Content=正文&RoomKey=fake_secret&ROOMKEY=fake_key&title=旧标题&channelOptions.bark.title=标题'));
    expect(input.content).toBe('正文');
    expect(input.channelOptions).toEqual({ bark: { title: '标题' } });
    expect(input.extra).toEqual({});
    expect(JSON.stringify(input.channelOptions)).not.toContain('fake_');
  });
  it('模板提取首个匹配、缺失值、非 JSON 回退和 HTML 转义', () => {
    expect(renderTemplate({ Variables: [{ VariableName: 'a', JsonPath: '$.items[*]' }, { VariableName: 'b', JsonPath: '$.missing' }], TemplateText: '{{ a }}|{{ b }}' }, '{"items":["<x>","second"]}', {})).toBe('&lt;x&gt;|');
    expect(renderTemplate({ Variables: [{ VariableName: 'a', JsonPath: '$.content' }], TemplateText: '{{ a }}' }, '纯文本', {})).toBe('纯文本');
    expect(renderTemplate({ Variables: [{ VariableName: 'a', JsonPath: '$.items[?@.id == 2].value' }], TemplateText: '{{ a }}' }, '{"items":[{"id":1,"value":"a"},{"id":2,"value":"b"}]}', {})).toBe('b');
  });
  it('保留原 JSON 内容的空格、换行和数字表达', () => {
    const raw = '{ "content": {"a": 1,\n "b":2} }';
    expect(postInput(new URLSearchParams(), JSON.parse(raw), raw).content).toBe('{"a": 1,\n "b":2}');
    expect(postInput(new URLSearchParams(), 1e3, '1e3').content).toBe('1e3');
  });
});
