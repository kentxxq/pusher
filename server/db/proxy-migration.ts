import { disabledProxy, proxySchema, type ProxySettings } from '../../shared/proxy';
import { SetupError } from '../errors';

export const proxyMigrationMarker = '-- pusher:data:split-channel-proxy';
export function convertLegacyProxies(rows: Array<{ id: number; proxy: string | null }>) {
  return rows.map(row => {
    try {
      let settings: ProxySettings = { ...disabledProxy };
      if (row.proxy?.trim()) {
        const url = new URL(row.proxy);
        if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) throw new Error();
        settings = proxySchema.parse({
          proxyEnabled: true, proxyProtocol: url.protocol.slice(0, -1), proxyHost: url.hostname,
          proxyPort: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
          proxyUsername: decodeURIComponent(url.username), proxyPassword: decodeURIComponent(url.password),
        });
      }
      return { id: row.id, settings };
    } catch { throw new SetupError(`渠道 ${row.id} 的旧代理配置无法迁移，请修正后重试`); }
  });
}
export function proxyMigrationValues(value: ProxySettings) {
  return [Number(value.proxyEnabled), value.proxyProtocol, value.proxyHost, value.proxyPort, value.proxyUsername, value.proxyPassword];
}
export const proxyMigrationUpdate = 'UPDATE `Channel` SET `ProxyEnabled`=?, `ProxyProtocol`=?, `ProxyHost`=?, `ProxyPort`=?, `ProxyUsername`=?, `ProxyPassword`=? WHERE `Id`=?';
