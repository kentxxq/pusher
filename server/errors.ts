// 仅用于可安全展示的配置和迁移诊断；数据库驱动原始错误不对外输出。
export class SetupError extends Error {}

// Drizzle 等适配层会将驱动异常放入 cause，仅提取受限格式的错误代码。
export function errorCode(error: unknown): string | undefined {
  const seen = new Set<object>();
  while (error && typeof error === 'object' && !seen.has(error)) {
    seen.add(error);
    if ('code' in error && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)) return error.code;
    error = 'cause' in error ? error.cause : undefined;
  }
}
