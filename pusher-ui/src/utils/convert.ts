import { ChannelMessageStatus } from '@/types/pusher/channel'

// 格式化时间,把2024-09-05T16:02:14+08:00变成2024-09-05 16:02:14
export function dateStringFormat(data: string): string {
  // const date = new Date(data)
  // const result = date.toISOString().replace('T', ' ').split('.')[0] // 将日期对象转换成 ISO 格式的字符串，并替换 "T" 为 " "，然后去掉毫秒部分
  // return result

  // 将后端返回的日期字符串转换为 Date 对象
  const date = new Date(data)

  // 获取用户的时区信息
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // 使用 Intl.DateTimeFormat 格式化日期到用户时区
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // 使用24小时制
    timeZone: userTimeZone // 设置用户时区
  }

  // 格式化日期为用户时区的本地时间
  const formatter = new Intl.DateTimeFormat('zh-CN', options)
  const formattedDateParts = formatter.formatToParts(date)

  // 从格式化的日期部分中提取年、月、日、时、分、秒
  const formattedDate = formattedDateParts.reduce(
    (acc, part) => {
      if (part.type !== 'literal') {
        // 排除掉不需要的符号
        acc[part.type] = part.value
      }
      return acc
    },
    {} as Record<string, string>
  )

  // 拼接成所需的格式 yyyy-MM-dd HH:mm:ss
  return `${formattedDate.year}-${formattedDate.month}-${formattedDate.day} ${formattedDate.hour}:${formattedDate.minute}:${formattedDate.second}`
}

// 格式化时间,把2024-09-05T16:02:14+08:00变成2024-09-05
export function dateTimeStringToDateString(data: string): string {
  // 将后端返回的日期字符串转换为 Date 对象
  const date = new Date(data)

  // 获取用户的时区信息
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // 使用 Intl.DateTimeFormat 格式化日期到用户时区，只保留年、月、日
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: userTimeZone // 设置用户时区
  }

  // 格式化日期为用户时区的本地日期
  const formatter = new Intl.DateTimeFormat('zh-CN', options)
  const formattedDateParts = formatter.formatToParts(date)

  // 从格式化的日期部分中提取年、月、日
  const formattedDate = formattedDateParts.reduce(
    (acc, part) => {
      if (part.type !== 'literal') {
        // 排除掉不需要的符号
        acc[part.type] = part.value
      }
      return acc
    },
    {} as Record<string, string>
  )

  // 拼接成所需的格式 yyyy-MM-dd
  return `${formattedDate.year}-${formattedDate.month}-${formattedDate.day}`
}

// 0转成ChannelMessageStatus字符串
export function toChannelMessageStatus(data: number) {
  return ChannelMessageStatus[data]
}
