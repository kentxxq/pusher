# 项目约定

## 通用准则

- 使用中文回复，包括计划、实现说明和注释；必要时附英文参照。
- 采用 MVP 原则，只实现必要功能。
- 不自动启动程序、执行格式化或构建、编写测试用例代码、标语、helper text 或 description；仅在用户明确要求时执行。
- 敏感信息使用 `fake_user`、`fake_password`、`fake_info`、`fake_url`、`fake_username`、`fake_email`、`fake_key`、`fake_secret`、`REPLACE_ME` 替代，不输出真实凭据。
- 临时脚本、中间数据和验证报告保存在根目录 `debug/`，使用 `tmpfile-AI-` 等可辨识前缀；该目录必须被 Git 忽略。
- 每次命令结束后清理本次启动的子程序和子进程；用户明确要求持续运行的除外。
- 使用 `vpx skills` 管理项目 skill。
- Node 依赖和命令统一通过 Vite+ 的 `vp`、`vpr`、`vpx` 管理，包管理器始终选择 pnpm，不直接调用 npm/pnpm。常用命令：`vp install`、`vp add`、`vpr dev`、`vpr build`、`vpr typecheck`。
- 所有 Python/pip 操作（包括技能示例）必须通过 uv，例如 `uv run python`、`uv pip install`；禁止使用 `--system`、`--break-system-packages`。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `pages/` | Void 页面、布局、Loader 和 Action |
| `components/`、`styles/` | Vue 公共组件与样式入口 |
| `routes/`、`middleware/` | 对外推送接口及身份、来源和 CSRF 校验 |
| `server/` | 配置、业务服务、数据库访问和 HTTP 适配 |
| `server/db/` | MySQL/SQLite schema、连接、Repository 和迁移执行代码 |
| `shared/` | 领域类型、业务常量、错误类型、校验及共享辅助代码；不全是纯类型 |
| `scripts/` | `start.ts` 生产启动、`database.ts` 数据库命令，以及迁移检查和 UI 构建接入工具 |
| `db/migrations/` | 随版本交付的 SQL 和迁移元数据；区别于 `server/db/` 的执行代码 |
| `Taskfile.yml` | SSH/rsync 发布任务及远端服务启停 |
| `docs/design/` | 当前有效设计，修改相关行为时使用 design 技能同步维护 |
| `db/legacy/` | .NET 最终版 MySQL 旧库的一次性转换 SQL，不参与自动迁移 |
| `tests/`、`types/` | 项目测试与类型补充 |
| `.agents/` | 项目技能 |
| `.void/`、`dist/` | Void 生成文件与构建产物，均不提交；不依赖 `.void/` 的内部入口实现部署扩展 |
| `data/`、`debug/`、`node_modules/` | 本地持久化数据、临时材料及安装依赖，均不提交 |

## 启动与部署

- 自定义服务器采用 [Void 官方文档介绍的 Programmatic Usage](https://void.cloud/integrations/nodejs-bun-deno#programmatic-usage)：独立启动脚本通过公开的 `dist/ssr/app.js` 导出使用 HTTP 应用。Taskfile 和 systemd 是本项目的部署配套，不是 Void 的官方部署配置。
- 使用 `vp run start` 执行 `tsx scripts/start.ts`：先迁移和初始化，再加载应用、启动 HTTP 服务及每日清理。默认 `node dist/ssr/index.js` 不执行这些项目启动步骤。
- 保持独立源码启动方式，不拦截生成入口，不从打包后的私有 chunk 导入内部函数。本方案暂不统一源码与构建产物各自的服务实例。
- Taskfile 只同步 `dist/`、`server/`、`shared/`、`scripts/`、`db/`、`package.json` 和 `pnpm-lock.yaml`。源码目录是生产启动脚本的运行依赖；`db/migrations/` 是运行时读取的迁移材料。
- `scripts/` 整目录同步是维护上的简化，`nuxt-ui.ts`、`check-migrations.ts` 不属于生产启动必需文件。
- `publish` 构建、检查远端环境、执行 `systemctl stop`、同步、安装锁定的生产依赖，再执行 `systemctl start`。`sync` 不安装依赖或启停服务。
- Taskfile 直接调用 oc-rsync 和 SSH，可通过 `SYNC_PROGRAM`、`SSH_PROGRAM` 指定路径；Windows 默认使用系统 OpenSSH。同步规则分别包含运行目录及 `目录/**`，保护配置、依赖和数据库后排除其余路径。默认通过 `--delete` 清理同步范围内的过期文件，`DELETE_ON_SYNC=false` 时只上传覆盖。
- 远端独立管理 `.env` 和数据目录，原生依赖在远端安装；不上传本机 `node_modules`、配置或数据库，不删除被同步规则排除的远端文件。
- systemd 服务及其权限由用户自行配置，Taskfile 仅调用 `systemctl stop/start`，服务名默认为 `pusher.service`，可用 `SYSTEMD_SERVICE` 覆盖。如用户授权使用临时容器验收，相关材料仅保存在 `debug/`。
- 详细发布步骤见 README，数据库、备份和单实例切换规则以 `docs/design/database-and-deployment.md` 为准。
