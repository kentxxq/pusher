---
outline: deep
---

# 字符串模板

## 由来

第三方平台配置消息通知的时候, 总会遇到这样的问题:

- `grafana` 在配置告警策略, 发现无法发送到飞书
- 接收到的 `webhook` 里有很多数据,但我只需要其中一部分

所以字符串模板的功能就孕育而生

- 接受任意格式的 `json` 数据, 通过`jsonpath`取值.
- 输出自定义格式.

## 使用

### 前提准备

我们计划用一个房间接收 `grafana` 发送的[企业微信格式](https://developer.work.weixin.qq.com/document/path/91770#%E6%96%87%E6%9C%AC%E7%B1%BB%E5%9E%8B)的 `json`,然后解析内容,自定义模板.

- 创建房间
- 创建一个飞书管道
- 房间关联管道

### 配置字符串模板

![创建企业微信模板示例](/assets/string-template/1.png)

- 模板名 `grafana-企业微信text`
- 我们取 json 里的 `$.text.content`, 赋值给`content`变量
- 输出我们自定义格式

然后去配置 `grafana`

![grafana配置](/assets/string-template/2.png)

- 配置企业微信, 以及 `webhook` 地址`https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByPost/房间code?templateCode=模板code`
- 我配置了 title 和 message,方便演示.

### 效果展示

飞书收到的提示如下:

```md
下面是接收到的数据
123
grafana 里的配置告警啦

by pusher
```

## 内置模板

> 不定期更新内置模板
> https://github.com/kentxxq/pusher/blob/main/pusher.webapi/Service/Database/DBService.cs#L132

- `Base`:
  - 如果不传递`templateCode`参数,会把`json`当做纯文本. 所以需要内置一个模板把数据取出来.
  - 转发 json 中`content`的值
- `Lark`: 接收[飞书的 webhook 请求](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot#756b882f), 转发`content.text`的内容
- `DingTalk`: 接收[钉钉的 webhook 请求](https://open.dingtalk.com/document/orgapp/robot-message-types-and-data-format#title-z74-8to-i7e), 转发`text.content`的内容
- `ComWechat`: 接收[企业微信的 webhook 请求](https://developer.work.weixin.qq.com/document/path/91770#%E6%96%87%E6%9C%AC%E7%B1%BB%E5%9E%8B), 转发`text.content`的内容

## 说明

### 安全问题

字符串模板**所有人共用,不要存放敏感信息**. 不像是 room 有 key 的保护, 如果模板包含敏感信息,可能会被利用.

### url 的长度限制

我在编写这一段的时候,本来采用钉钉发送.结果发现`grafana`的钉钉 webhook 地址**限制了长度**. 当我的`房间code` 和`字符串模板code` 都是 uuid 的时候,无法填写完整....所以我采用企业微信作为示例.

虽然可以使用自定义 roomCode 变短, 但`grafana`是支持`webhook`直接传递数据的, 采用 webhook 传递数据会更加友好一些.
