import { migrateDatabase } from '../server/db/migrations';
import { services, closeServices } from '../server/services';
import { SetupError } from '../server/errors';
import { BusinessError } from '../shared/domain';

const command = process.argv[2];
try {
  if (command !== 'migrate' && command !== 'baseline') throw new Error('不支持的数据库命令');
  await migrateDatabase(command);
  if (command === 'migrate') await services().system.initialize();
  console.log(command === 'baseline' ? '数据库基线登记完成，请继续执行 db:migrate' : '数据库迁移和初始化完成');
} catch (error) {
  // 数据库驱动错误可能包含地址或 SQL，不直接打印原始错误。
  console.error(error instanceof SetupError || error instanceof BusinessError ? error.message : '数据库操作失败，请核对配置、权限及数据库结构');
  process.exitCode = 1;
} finally { await closeServices(); }
