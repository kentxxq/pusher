# .NET 旧版迁移

适用于最后一个 .NET 版本的 MySQL 旧库，保留原有上海时间。以下操作先停止旧应用，并从项目根目录执行；连接信息和库名替换为实际值，`-p` 交互输入密码。

## 1. 备份数据库

```sh
mysqldump -h REPLACE_ME -u fake_user -p --single-transaction --no-tablespaces --hex-blob --result-file=REPLACE_ME.sql REPLACE_ME
```

## 2. 执行 SQL

在 Bash 或服务器终端执行：

```sh
mysql -h REPLACE_ME -u fake_user -p --database=REPLACE_ME < db/legacy/dotnet-to-ts.mysql.sql
```

## 3. 登记基线并迁移

确认项目 `.env` 指向同一个数据库，依次执行：

```sh
vpr db:baseline
vpr db:migrate
```

任一步失败即停止，不继续下一步。新建库只需 `vpr db:migrate`，不执行旧库 SQL 或 baseline。
