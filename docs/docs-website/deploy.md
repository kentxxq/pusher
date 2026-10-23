# 部署

## 编译部署

前端构建后将`./dist`目录使用`nginx`挂载即可

```shell
git clone https://github.com/kentxxq/pusher-ui
pnpm i
pnpm build
```

后端先构建程序. 下面是`linux-x64`. 构建物在`out`文件夹.

```shell
git clone https://github.com/kentxxq/pusher
dotnet restore
dotnet publish -c Release -o out -r linux-x64 -p:IncludeNativeLibrariesForSelfExtract=true -p:PublishSingleFile=true --self-contained true
```

构建后,调整修改`appsettings.json`配置文件,直接运行二进制文件`pusher.webapi`即可.

关于`appsettings.json`,现在可以调整下面的内容

- 可以调整数据库类型
- 调整 jwt 的密钥: 一定要调整,确保安全
- 调整日志
  - 日志格式
  - 日志路径
  - 保存天数
- 邮箱相关配置: 用于发送邮件

## docker/compose 部署

todo...
