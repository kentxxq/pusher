using Microsoft.Data.Sqlite;
using pusher.webapi.Models;
using Serilog;
using SqlSugar;

namespace pusher.webapi.Common;

/// <summary>
///     数据库初始化工具
/// </summary>
public static class DatabaseUtils
{
    public static SqlSugarClient GetSqlSugarClientFromConfig(IConfiguration config)
    {
        var connectionString = config["Database:ConnectionString"];
        var dbType = (DbType)int.Parse(config["Database:DbType"] ?? "2"); //2是sqlite
        var db = new SqlSugarClient(new ConnectionConfig
        {
            ConnectionString = connectionString,
            DbType = dbType,
            IsAutoCloseConnection = true
        });
        return db;
    }

    /// <summary>
    ///     初始化数据库
    /// </summary>
    /// <param name="config"></param>
    public static void InitAndSyncDatabase(IConfiguration config)
    {
        var connectionString = config["Database:ConnectionString"];
        var dbType = (DbType)int.Parse(config["Database:DbType"] ?? "2"); //2是sqlite
        var db = GetSqlSugarClientFromConfig(config);

        // 即使sqlite文件不存在，CheckConnection也会检查通过
        // 所以单独处理
        if (dbType == DbType.Sqlite)
        {
            var sqliteConnectionStringBuilder = new SqliteConnectionStringBuilder(connectionString);
            if (File.Exists(sqliteConnectionStringBuilder.DataSource))
            {
                Log.Information($"检测到数据库文件{sqliteConnectionStringBuilder.DataSource}");
            }
            else
            {
                Log.Information($"数据库{sqliteConnectionStringBuilder.DataSource}不存在");
                CreateDatabase(db);
            }

            SyncTable(db);
            CreateAdminUser(db);
        }
        else // 其他类型数据库
        {
            try
            {
                db.Ado.CheckConnection();
                Log.Information("数据库连接成功");
                SyncTable(db);
                CreateAdminUser(db).GetAwaiter().GetResult();
            }
            catch (Exception)
            {
                Log.Information("数据库连接失败");
                // mysql是先建库,然后授权.所以不需要建库了
                // CreateDatabase(db);
                SyncTable(db);
                CreateAdminUser(db).GetAwaiter().GetResult();
            }
        }
    }

    /// <summary>
    ///     重置数据库
    /// </summary>
    /// <param name="db"></param>
    /// <returns></returns>
    public static void ResetDatabase(ISqlSugarClient db)
    {
        var tables = db.DbMaintenance.GetTableInfoList(false);
        var tableNames = tables.Select(t => t.Name).ToArray();
        db.DbMaintenance.DropTable(tableNames);
        SyncTable(db);
    }

    /// <summary>
    ///     创建数据库
    /// </summary>
    /// <param name="db"></param>
    /// <exception cref="ApplicationException"></exception>
    public static void CreateDatabase(ISqlSugarClient db)
    {
        var databaseCreated = db.DbMaintenance.CreateDatabase();
        if (!databaseCreated)
        {
            throw new ApplicationException($"数据库{db.Ado.Connection.Database}创建失败....");
        }
    }

    /// <summary>
    ///     同步表结构
    /// </summary>
    /// <param name="db"></param>
    private static void SyncTable(ISqlSugarClient db)
    {
#pragma warning disable CS8602 // 解引用可能出现空引用。
        var types = typeof(User).Assembly
            .GetTypes()
            .Where(it => it.FullName.StartsWith($"{ThisAssembly.Project.AssemblyName}.Models"))
            .ToArray();
#pragma warning restore CS8602 // 解引用可能出现空引用。
        Log.Information("开始同步表结构");
        db.CodeFirst.SetStringDefaultLength(200).InitTables(types); //根据types创建表
    }

    /// <summary>
    ///     初始化数据库的时候, 创建一下admin用户.
    /// </summary>
    /// <param name="client"></param>
    public static async Task<int> CreateAdminUser(ISqlSugarClient client)
    {
        var user = await client.Queryable<User>().Where(u => u.Username == "ken").FirstAsync();
        if (user is null)
        {
            var initUser = new User { Username = "ken", Password = "ken", RoleType = RoleType.Admin };
            var id = await client.Insertable(initUser).ExecuteReturnIdentityAsync();
            Log.Information("初始化ken用户成功");
            return id;
        }

        Log.Information("ken用户已存在,不插入新数据");
        return user.Id;
    }
}
