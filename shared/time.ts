// 业务时间统一保存为上海时间，不依赖运行机器或浏览器的本地时区。
export function timestamp(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600000).toISOString().replace('T', ' ').replace('Z', '');
}

export function parseTimestamp(value: string) {
  return Date.parse(`${value.replace(' ', 'T')}+08:00`);
}
