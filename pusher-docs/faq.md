# FAQ

## webhook 管道用法

市面上有很多的平台支持消息通知, `pusher`很难在第一时间就能支持转发.

所以创建了`webhook`类型管道, 把`文本`原样转发到`webhook管道地址`, 这样可以做到以下几点

1. **pusher 嵌套**. A 用户添加 B 用户的房间为`webhook管道`,这样 A 用户就可以给 B 用户推送消息, **实现了套娃.** 同时 A 用户还可以添加 C,D,E...很多的用户房间, **实现了消息广播**.
2. **兼容各种第三方管道**. 例如我们没有实现[Qmsg](https://qmsg.zendee.cn/docs/api/#json%E5%8F%82%E6%95%B0%E6%8E%A8%E9%80%81%E6%8E%A5%E5%8F%A3)管道, 这个管道用于对 QQ 进行推送. 但我们可以通过添加一个`webhook`管道来实现消息转发. 这里有[一个案例](https://github.com/kentxxq/pusher/issues/1)
   > 我们可以发送 json `{"msg":1}` 转发到 Qmsg. 也可以发送字符串`1`, 然后通过[字符串模板](/string-template)渲染成`{"msg":1}`
