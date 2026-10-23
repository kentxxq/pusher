# 管道配置说明

不同管道有不同的特性支持，本文档介绍了具有特殊支持和用法的管道配置。

## Bark

[Bark](https://github.com/Finb/Bark) 是一款开源的自定义通知推送 APP。

### 参数透传

通过发送消息接口（`SendMessageByGet` 或 `SendMessageByPost`）传递的额外参数，无论是写在 URL 的 query 中，还是放在 JSON Body 中，都会自动**透传**给 Bark。

这使得你可以完全自定义 Bark 的各种属性，例如 `icon`, `url`, `isArchive`, `group` 等。

**GET 方式透传示例 (指定群组和图标):**
```shell
curl "https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByGet/你的房间code?content=123&group=work&icon=https://example.com/icon.png"
```

**POST 方式透传示例 (更复杂的参数):**
```shell
curl -X POST https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByPost/你的房间code \
     -H "Content-Type: application/json" \
     -d '{"content":"123", "group":"work", "icon":"https://example.com/icon.png", "isArchive": 1}'
```

> **注意:** 透传参数会覆盖默认发往 Bark 的参数（默认 `body` 为具体消息，`title` 为 pusher，`group` 为 pusher）。

### 数据加密

为了保证数据安全，Pusher 支持对推送到 Bark 的内容进行加密。使用前需要在系统后台新建或编辑管道，并在此管道的**管道配置(JSON)** 中填入相应的加密信息。如果在 Bark App 内配置了加密算法，也可以在此处对应配置：

```json
{
  "encryptionMode": "AES128CBC",
  "encryptionKey": "你的加密密钥",
  "encryptionIv": "你的初始向量(IV)"
}
```

支持的加密模式 (`encryptionMode`) 如下：
- `None` (不加密，默认)
- `AES128CBC`
- `AES128ECB`
- `AES256CBC`
- `AES256ECB`

## Telegram (电报)

通过 Telegram Bot 发送消息。管道配置内的`管道地址`应填写带上 `chatId` 的 url，如 `https://api.telegram.org/bot<token>/sendMessage?chatId=<chat_id>`

### Topic 设置

如果目标群组开启了 Topic（话题）功能，可以通过 `message_thread_id` 参数发送消息到指定的 Topic 中。有两种方式支持：

1. **直接写入管道地址:**
在后台配置管道地址时，可以在 URL 后面添加 `message_thread_id`：
```text
https://api.telegram.org/bot<token>/sendMessage?chatId=<chat_id>&message_thread_id=<topic_id>
```

2. **运行时参数透传:**
通过参数透传的方式，在调用发信接口时动态传入 `message_thread_id`:
```shell
curl "https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByGet/你的房间code?content=123&message_thread_id=1234"
```

### 参数透传

除了 Topic 之外，Telegram 频道同样支持参数透传，可以透传 `parse_mode` (消息格式), `disable_web_page_preview` 等 Telegram 官方支持的任何其他参数。
