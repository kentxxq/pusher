-- 最后一个 .NET 版本的 MySQL 旧库 → TS 首版。
-- 先按 docs/dotnet-to-ts-migration.md 停服备份，并显式选择目标数据库。
-- 仅适用于历史时间已经是 Asia/Shanghai 的旧库；不转换时间值。
-- 不适用于新库或已有 Drizzle 迁移记录的库，不属于自动迁移链。
-- MySQL DDL 会隐式提交；任一步失败立即停止，不使用 --force，不整份盲目重跑。

ALTER TABLE `Channel`
  ALTER COLUMN `ChannelType` SET DEFAULT 0;

ALTER TABLE `ChannelMessageHistory`
  ALTER COLUMN `Status` SET DEFAULT 0,
  ALTER COLUMN `Success` SET DEFAULT 0;

ALTER TABLE `Message`
  MODIFY COLUMN `RecordTime` datetime(3) NOT NULL,
  ALTER COLUMN `MessageType` SET DEFAULT 0;

ALTER TABLE `Room`
  MODIFY COLUMN `CreateDate` datetime(3) NOT NULL;

ALTER TABLE `StringTemplate`
  MODIFY COLUMN `StringTemplateObject` text NOT NULL;

ALTER TABLE `User`
  MODIFY COLUMN `LastForgetTime` datetime(3) NULL,
  MODIFY COLUMN `LastLoginTime` datetime(3) NULL,
  ALTER COLUMN `RoleType` SET DEFAULT 0;

-- 完成后执行 vpr db:baseline 和 vpr db:migrate。
-- 不手工插入 __drizzle_migrations，不重置业务表。
