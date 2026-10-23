# Pusher

Void Pages + Vue + Nuxt UI 的消息推送中心，使用 Drizzle 连接 MySQL 或 SQLite。旧版前后端与文档保存在 [archive 分支](https://github.com/kentxxq/pusher/tree/archive)。

## 配置与开发

需要 Node.js 24.21 或更高版本及 Vite+；依赖统一通过 `vp` 管理，包管理器使用 pnpm。

```sh
vp install
```

复制根目录 `.env.example` 为 `.env`，按需填写配置。环境变量优先于 `.env`；真实配置不提交到 Git。

| 配置 | 说明 |
| --- | --- |
| `DB_DIALECT` | `mysql`（默认）或 `sqlite` |
| `DATABASE_URL` | MySQL 连接串，仅 MySQL 模式需要 |
| `SQLITE_PATH` | SQLite 文件路径，相对项目根目录，默认 `./data/pusher.sqlite` |
| `APP_URL` | 用户实际访问的完整站点地址，必须与 Action 请求的 Origin 一致 |
| `JWT_KEY` | 至少 32 字节的 Base64 密钥；接管旧版时沿用旧密钥 |
| `JWT_ISSUER` / `JWT_AUDIENCE` | JWT 签发者与受众，接管时沿用原值 |
| `JWT_EXPIRE_DAYS` | 登录有效天数，默认 1 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 首次初始化管理员，已有管理员不会被覆盖 |
| `SMTP_*` | 邮件服务配置，供注册/找回密码及邮箱管道使用 |
| `TASK_TIMEZONE` | 每日 02:00 清理任务的时区，默认 `Asia/Shanghai` |
| `MESSAGE_RETENTION_DAYS` | 消息保留天数，默认 30，沿用旧版按完整天数判断的规则 |
| `DEMO_USERNAME` | 每日重置数据的示例账号，默认 `test`，不存在则跳过 |

新部署可以用以下命令生成 JWT 密钥；已有部署应迁入旧密钥：

```sh
vp node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64'))"
vpr db:migrate
vpr dev
```

MySQL 的数据库和账号需事先创建并授权。SQLite 自动创建目录及文件。应用保留旧版密码存储和密码邮件行为，账号迁入不做密码转换。

`vpr dev` 读取 `.env` 中的 `HOST`、`PORT`，开发时也应使用与 `APP_URL` 一致的访问地址。端口被占用时会报错，不自动切换端口。开发模式不自动迁移数据库或运行每日清理任务；已初始化的数据库可直接复用。

## 页面与接口

页面使用 Loader/Action 调用共享 Service；Service 通过 Repository 使用 Drizzle。Vue 组件仅接收页面 Props，不直接访问数据库。

页面包含概览、账号、房间、管道、模板、消息历史、用户管理和系统维护。修改已有管道时，地址、代理和配置留空会保留原值；完整凭据不回显。详情页面可显式清除代理、JSON 配置或房间密钥。

仅保留两个旧推送接口，管理功能通过页面操作：

```text
GET  /pusher.webapi/Room/SendMessageByGet/:roomCode?content=消息内容&roomKey=房间密钥
POST /pusher.webapi/Room/SendMessageByPost/:roomCode?roomKey=房间密钥&templateCode=模板代码&messageType=Text
```

POST 接受原 JSON 请求体。透传参数、Body 覆盖 Query 的规则沿用旧版。支持钉钉、企业微信、飞书、Telegram、Bark、邮箱、Webhook 和 Qmsg。

## SQL 迁移

```sh
vpr db:generate
vpr db:check
vpr db:migrate
```

`db:generate` 分别生成 MySQL、SQLite 的 SQL 与快照，审阅后与 schema 一并提交。业务代码没有结构变化时不生成空迁移。数据回填使用 Drizzle 自定义迁移。`db:check` 在被忽略的 debug 副本里检查 schema 与快照是否一致，不修改正式迁移。

`db:migrate` 使用 `.env` 选择数据库，仅执行未应用的迁移，然后幂等补齐管理员和四个系统模板。不会覆盖已有密码和模板。已经应用的 SQL 不得修改，校验和不匹配时会停止。

接管现有数据库：

1. 停止旧版写入与定时任务，备份数据库和旧配置。
2. 在副本上核对表名大小写、字段、类型、长度、时间精度、时区、默认值、字符集和排序规则。
3. 当前 schema 按存档模型建立，线上实际结构尚未读取。如果不匹配，应先完成 schema 映射及迁移审阅，不要跳过检查或在生产直接执行建表。
4. 在确认副本兼容后执行 `vpr db:baseline`，只登记已经存在的初始结构，再执行 `vpr db:migrate`。
5. 在副本验证登录、推送、历史数据、统计和清理边界，再对线上重复已验证的步骤。

新建库不需要 baseline。程序检测到没有迁移记录的旧业务表时会停止，避免重复建表。基线命令只登记第一个迁移，后续迁移仍需正常执行。基线字段检查不能代替对字符集、默认值、索引及旧数据时间语义的人工核对。新数据时间采用 UTC，旧数据接管前必须确认其原存储时区。

## 验证与构建

```sh
vpr typecheck
vpr build
vpr test
vpr docs:build
```

测试使用隔离 SQLite 文件和 mock 管道，不发送真实推送。构建后的请求测试直接调用 `app.fetch`，不启动 HTTP 服务、不执行浏览器或桌面 Computer Use 测试。先构建再运行测试，才能覆盖生产产物。

设置 `TEST_MYSQL_URL` 后，测试也运行 MySQL 集成验证；只接受数据库名以 `pusher_ai_test_` 开头的连接，测试会清空该独立数据库。本地示例：

```dotenv
TEST_MYSQL_URL=mysql://fake_user:fake_password@localhost:3306/pusher_ai_test_local
```

## 发布与 Docker

```sh
vpr build
vpr start
```

`start` 依次校验配置、执行迁移、幂等初始化，然后监听端口并启动清理任务。迁移失败不会启动服务。仅 `start` 负责生产调度，开发模式不自动执行清理。

使用 HTTPS 反向代理时，将 `APP_URL` 设置为实际对外来源。生产入口据此规范请求来源，使 Void 的同源 Action 检查正常工作；不使用客户端提供的转发头决定可信来源。

```sh
docker build -t pusher .
docker run --rm --env-file .env -p 3000:3000 -v pusher-data:/app/data pusher
```

SQLite 使用 `SQLITE_PATH=/app/data/pusher.sqlite`；MySQL 使用容器可访问的独立实例地址。`.env`、debug 和数据库文件不会进入镜像。容器以非 root 用户运行，绑定本地目录时需确保目录可写。

单实例部署；切换期间只允许一个版本写入和执行定时任务。MySQL DDL 可能部分执行后失败，不假设能够整体事务回滚。失败时停止新版，根据实际迁移情况修复或恢复备份后切回旧版。SQLite 使用一致性备份，启用 WAL 时不要仅复制正在写入的主文件。

## 文档与参考代码

当前系统设计见 [docs/design/architecture.md](docs/design/architecture.md)，涵盖架构、账号与管理、消息投递、数据库及部署。修改相关行为时，按项目的 design 技能同步维护设计文档。

旧文档原样迁入 `docs/docs-website/`，正文暂沿用旧版。文档目录 README 说明维护方式。

本次重写的旧代码参考位于被忽略的 `debug/tmpfile-AI-archive/`，不参与构建。

<details>
<summary>第三方版权声明</summary>

MIT License

Copyright (c) 2025 Nuxt UI Templates

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

</details>

