# Pusher

Void Pages + Vue + Nuxt UI 的消息推送中心，使用 Drizzle 连接 MySQL 或 SQLite。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `pages/` | Void 页面、布局以及页面 Loader/Action |
| `components/`、`styles/` | 公共 Vue 组件与样式 |
| `routes/`、`middleware/` | 对外推送接口、身份与来源校验 |
| `server/` | 配置、业务服务、HTTP 适配；其中 `server/db/` 是数据库 schema、连接和操作代码 |
| `shared/` | 领域类型、业务常量、错误类型及共享校验代码 |
| `scripts/` | 生产启动、数据库命令、迁移检查和 UI 构建接入工具 |
| `db/migrations/` | 运行时读取的 SQL 及迁移元数据，不是数据库文件 |
| `db/legacy/` | .NET 最终版 MySQL 旧库的一次性转换 SQL，不参与自动迁移 |
| `Taskfile.yml` | SSH/rsync 发布任务及远端服务启停 |
| `docs/design/` | 当前设计文档 |
| `tests/`、`types/`、`.agents/` | 测试、类型补充和项目技能 |
| `.void/`、`dist/` | Void 生成文件与构建产物，不提交 Git |
| `data/`、`debug/`、`node_modules/` | 本地数据、临时材料及安装依赖，不提交 Git |

协作约定见 [AGENTS.md](AGENTS.md)，系统设计以 `docs/design/` 为准。

## 配置与开发

需要 Node.js 24.x（至少 24.22.0）或 26.12.0 及以上版本，以及 Vite+；依赖统一通过 `vp` 管理，包管理器使用 pnpm。

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

业务时间的生成、存储、页面显示和统计统一采用上海时间（`Asia/Shanghai`）。MySQL 使用 `DATETIME(3)`，SQLite 使用同样格式的时间字符串；应用解析时显式指定 `+08:00`，不依赖运行机器的时区。MySQL 全局时区可以保持上海时间，手工写入业务时间也应使用上海时间，不能混入 UTC 值。JWT 签发与过期仍使用标准时间戳。

`vpr dev` 读取 `.env` 中的 `HOST`、`PORT`，开发时也应使用与 `APP_URL` 一致的访问地址。端口被占用时会报错，不自动切换端口。开发模式不自动迁移数据库或运行每日清理任务；已初始化的数据库可直接复用。

## 页面与接口

页面使用 Loader/Action 调用共享 Service；Service 通过 Repository 使用 Drizzle。Vue 组件仅接收页面 Props，不直接访问数据库。

页面包含概览、账号、房间、管道、模板、消息历史、用户管理和系统维护。修改已有管道时，地址和配置留空会保留原值，完整内容不回显；代理地址正常回显，删空后保存即可移除代理。房间详情页面可显式清除房间密钥。

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

`db:migrate` 和 `db:baseline` 通过 tsx 执行独立数据库脚本，不要求先构建页面。`db:migrate` 使用 `.env` 选择数据库，仅执行未应用的迁移，然后幂等补齐管理员和四个系统模板。不会覆盖已有密码和模板。已经应用的 SQL 不得修改，校验和不匹配时会停止。

新建库直接运行 `vpr db:migrate`，不需要 baseline。程序检测到没有迁移记录的旧业务表时会停止，避免重复建表；表名识别遵守 MySQL 的大小写设置。`.NET` 旧库接管见文末说明。

`vpr db:baseline` 校验已有结构，只登记第一条迁移，不执行建表 SQL 或业务初始化。MySQL 校验包括字段类型、精度、可空性、主键、自增和默认值；仍需人工核对完整索引、字符集和排序规则。已有迁移记录时禁止重复登记，后续迁移仍通过 `db:migrate` 执行。

## 验证与构建

```sh
vpr typecheck
vpr build
vpr test
```

测试使用隔离 SQLite 文件和 mock 管道，不发送真实推送。构建后的请求测试直接调用 `app.fetch`，不启动 HTTP 服务、不执行浏览器或桌面 Computer Use 测试。先构建再运行测试，才能覆盖生产产物。

设置 `TEST_MYSQL_URL` 后，测试也运行 MySQL 集成验证；只接受数据库名以 `pusher_ai_test_` 开头的连接，测试会清空该独立数据库。本地示例：

```dotenv
TEST_MYSQL_URL=mysql://fake_user:fake_password@localhost:3306/pusher_ai_test_local
```

## 发布与 systemd

```sh
vpr build
vpr start
```

`start` 执行 `tsx scripts/start.ts`，依次校验配置、执行迁移、幂等初始化，再导入 `dist/ssr/app.js`、监听端口并启动每日清理。迁移失败不会启动服务，开发模式不自动执行清理。默认 `node dist/ssr/index.js` 不包含这些项目启动步骤，不能替代 `start`。

该自定义服务器采用 [Void 官方文档介绍的 Programmatic Usage](https://void.cloud/integrations/nodejs-bun-deno#programmatic-usage)，通过公开的 `app.js` 导出使用 HTTP 应用；不替换 `.void/` 生成入口，不读取构建后的私有 chunk。Taskfile 和 systemd 是本项目配套的发布和进程管理方式，不是 Void 官方提供的部署配置。本方案保留源码入口与构建产物各自的服务实例，尚未统一连接生命周期。

使用 HTTPS 反向代理时，将 `APP_URL` 设置为实际对外来源。生产入口据此规范请求来源，使 Void 的同源 Action 检查正常工作；不使用客户端提供的转发头决定可信来源。

### SSH 与 systemd 部署

发布同步以下内容，并在服务器安装生产依赖；tsx 属于生产依赖，不上传本机 `node_modules`。

| 同步内容 | 运行时用途 |
| --- | --- |
| `dist/` | 构建后的 HTTP 应用、SSR 页面和浏览器静态资源 |
| `scripts/` | `start.ts` 启动服务，`database.ts` 提供迁移与基线命令；整目录同步是维护上的简化，UI 构建接入和迁移检查脚本不属于启动必需文件 |
| `server/` | 启动脚本导入的配置、迁移、初始化和清理服务及其数据库依赖 |
| `shared/` | 上述服务导入的业务常量、错误类型和校验等运行时代码，不全是纯类型 |
| `db/` | 当前包含 `migrations/`，迁移执行时从磁盘读取 SQL 与元数据 |
| `package.json`、`pnpm-lock.yaml` | 运行命令、生产依赖声明及锁定版本 |

Taskfile 直接调用 oc-rsync，从项目根目录按包含和排除规则同步运行文件；无需暂存目录或辅助脚本。规则分别包含目录及 `目录/**`，`.env*`、`data/`、`debug/`、`node_modules/` 和 SQLite 文件均排除，既不上传也不删除，其他远端根目录内容也保留。默认通过 `--delete` 清理同步范围内的过期文件，`DELETE_ON_SYNC=false` 时只上传覆盖。首次部署需在服务器完成以下准备：

1. 本机安装 Task、Node、vp 和 [oc-rsync](https://github.com/oferchen/rsync/releases)，将 `oc-rsync` 加入 PATH，或在 `.env` 的 `SYNC_PROGRAM` 指定完整路径。Windows 默认使用系统 OpenSSH，其他平台默认 `ssh`，可通过 `SSH_PROGRAM` 覆盖。服务器安装标准 rsync、符合 `package.json` 要求的 Node 和 vp，确保发布账号通过非交互 SSH 能执行 vp；找不到时，在本机 `.env` 的 `REMOTE_VP` 填入远端 `command -v vp` 输出的绝对路径。Windows oc-rsync v0.6.4 的直接上传、过滤及删除已验证。
2. 创建应用目录和服务器专用 `.env`，确认发布账号能写入应用目录，运行账号能读取配置并写入 SQLite 数据目录。
3. systemd 服务及发布账号的启停权限由你自行配置；Taskfile 仅执行 `systemctl stop` 和 `systemctl start`。默认服务名为 `pusher.service`，可用 `SYSTEMD_SERVICE` 覆盖。
4. 在本机 `.env` 配置部署连接参数。

```sh
task publish
```

`publish` 依次构建、检查远端配置、执行 `systemctl stop`、同步文件、执行 `vp install --prod --frozen-lockfile`、执行 `systemctl start`。`sync` 只同步已有产物，`exec` 执行指定远端命令，`check` 检查 SSH。发布中途失败会停止后续步骤；停服后同步或安装失败则保持停止，修复后重新发布。

服务应使用项目的生产启动脚本，例如 `vp run start`。SQLite 默认存放在 `./data/pusher.sqlite`，需确保运行账号可写；应用目录更新不能覆盖数据目录。MySQL 地址需能从服务器访问。

单实例部署；切换期间只允许一个版本写入和执行定时任务。MySQL DDL 可能部分执行后失败，不假设能够整体事务回滚。失败时停止新版，根据实际迁移情况修复或恢复备份后切回旧版。SQLite 使用一致性备份，启用 WAL 时不要仅复制正在写入的主文件。

## 设计文档

当前系统设计见 [docs/design/architecture.md](docs/design/architecture.md)，涵盖架构、账号与管理、消息投递、数据库及部署。修改相关行为时，按项目的 design 技能同步维护设计文档。

## .NET 旧版迁移

旧版前后端与文档保存在 [archive 分支](https://github.com/kentxxq/pusher/tree/archive)。迁移到当前 TS 应用请参阅 [.NET 旧版迁移说明](docs/dotnet-to-ts-migration.md)。
