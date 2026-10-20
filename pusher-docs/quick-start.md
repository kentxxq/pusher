# 快速上手

## 注册/忘记密码

官网地址: [pusher.kentxxq.com](https://pusher.kentxxq.com)

测试账号: `fake_username` 密码: `fake_password`

- 注册: 就是填入你的邮箱地址,系统会自动创建账号. 然后发送密码到你的邮箱
- 忘记密码: 把密码发送到你的邮箱.
- **每晚自动重置 test 账号信息, 并清理没有登录过的账号.**

> 发送邮箱的频率有限制, 避免被爆破...

## 新建房间

![房间](/assets/q/room.png)

`房间`类似于聊天室, **是消息的入口**

- `房间名`: 方便用户记忆
- `房间code`: 用于区分不同房间, 具有唯一性

## 添加管道

![管道](/assets/q/channel.png)

`管道`就是钉钉,飞书之类的 webhook. 这些管道可以通往不同的地方.

- `管道名称`: 方便用户记忆
- `管道类型`: 飞书/钉钉/企业微信...不同管道有不同的 json 格式
- `管道地址`: 管道的 url 地址
- `代理地址`: 管道的代理地址,`https://用户名:密码@proxy.com:7890`

## 房间关联管道

![关联](/assets/q/r.png)

## 发送信息

**简单版本**: 直接通过 get 请求发送信息

```shell
curl https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByGet/你的房间code?content=123

# 非 ascii 字符转码
curl -G "https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByGet/你的房间code" \
--data-urlencode "你好"
```

**复杂版本**

- 通过 post 发送 json 数据
- 传递参数
  - `templateCode=your-template-code` 使用特定的[字符串模板](/string-template) 解析 json, 生成自定义内容发送到管道
  - `roomKey=111` 房间需要密钥 `111` 才能访问
  - 可以使用`\n`进行换行

```shell
curl -X POST https://pusher.kentxxq.com/pusher.webapi/Room/SendMessageByPost/你的房间code?templateCode=your-template-code&roomKey=111 \
     -H "Content-Type: application/json" \
     -d '{"content":"123\n你好"}'
```
