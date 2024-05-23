using Microsoft.Data.Sqlite;
using pusher.webapi.Common;
using pusher.webapi.Models;
using SqlSugar;

namespace pusher.webapi.Service.Database;

public class DBService
{
    private readonly ILogger<DBService> _logger;
    private readonly Repository<StringTemplate> _repStringTemplate;
    private readonly Repository<User> _repUser;
    private readonly ISqlSugarClient _sugarClient;

    public DBService(ISqlSugarClient sugarClient, ILogger<DBService> logger,
        Repository<StringTemplate> repStringTemplate, Repository<User> repUser)
    {
        _sugarClient = sugarClient;
        _logger = logger;
        _repStringTemplate = repStringTemplate;
        _repUser = repUser;
    }

    /// <summary>
    ///     初始化数据库
    /// </summary>
    public async Task InitAndSyncDatabase()
    {
        // 即使sqlite文件不存在，CheckConnection也会检查通过
        // 所以单独处理
        if (_sugarClient.CurrentConnectionConfig.DbType == DbType.Sqlite)
        {
            var sqliteConnectionStringBuilder =
                new SqliteConnectionStringBuilder(_sugarClient.CurrentConnectionConfig.ConnectionString);
            if (File.Exists(sqliteConnectionStringBuilder.DataSource))
            {
                _logger.LogInformation($"检测到数据库文件{sqliteConnectionStringBuilder.DataSource}");
            }
            else
            {
                _logger.LogInformation($"数据库{sqliteConnectionStringBuilder.DataSource}不存在");
                CreateDatabase();
            }

            SyncTable();
            await CreateAdminUser();
        }
        else // 其他类型数据库
        {
            try
            {
                _sugarClient.Ado.CheckConnection();
                _logger.LogInformation("数据库连接成功");
                SyncTable();
                await CreateAdminUser();
            }
            catch (Exception)
            {
                _logger.LogInformation("数据库连接失败");
                // mysql是先建库,然后授权.所以不需要建库了
                // CreateDatabase(db);
                SyncTable();
                await CreateAdminUser();
            }
        }
    }

    /// <summary>
    ///     重置数据库
    /// </summary>
    /// <returns></returns>
    public void ResetDatabase()
    {
        var tables = _sugarClient.DbMaintenance.GetTableInfoList(false);
        var tableNames = tables.Select(t => t.Name).ToArray();
        _sugarClient.DbMaintenance.DropTable(tableNames);
        SyncTable();
    }

    /// <summary>
    ///     创建数据库
    /// </summary>
    /// <exception cref="ApplicationException"></exception>
    public void CreateDatabase()
    {
        var databaseCreated = _sugarClient.DbMaintenance.CreateDatabase();
        if (!databaseCreated)
        {
            throw new ApplicationException($"数据库{_sugarClient.Ado.Connection.Database}创建失败....");
        }
    }

    /// <summary>
    ///     同步表结构
    /// </summary>
    private void SyncTable()
    {
#pragma warning disable CS8602 // 解引用可能出现空引用。
        var types = typeof(User).Assembly
            .GetTypes()
            .Where(it => it.FullName.StartsWith($"{ThisAssembly.Project.AssemblyName}.Models"))
            .ToArray();
#pragma warning restore CS8602 // 解引用可能出现空引用。
        _logger.LogInformation("开始同步表结构");
        _sugarClient.CodeFirst.SetStringDefaultLength(200).InitTables(types); //根据types创建表
    }

    /// <summary>
    ///     初始化数据库的时候, 创建一下admin用户.
    /// </summary>
    public async Task<int> CreateAdminUser()
    {
        var user = await _sugarClient.Queryable<User>().Where(u => u.Username == "ken").FirstAsync();
        if (user is null)
        {
            var initUser = new User { Username = "ken", Password = "ken", RoleType = RoleType.Admin };
            var id = await _sugarClient.Insertable(initUser).ExecuteReturnIdentityAsync();
            _logger.LogInformation("初始化ken用户成功");
            return id;
        }

        _logger.LogInformation("ken用户已存在,不插入新数据");
        return user.Id;
    }

    /// <summary>
    ///     重置系统模板
    /// </summary>
    /// <returns></returns>
    public async Task<bool> ResetSystemStringTemplates()
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == "ken");
        List<string> systemTemplateCode =
            [nameof(ChannelEnum.Lark), nameof(ChannelEnum.ComWechat), nameof(ChannelEnum.DingTalk),"Base"];
        await _repStringTemplate.DeleteAsync(t => systemTemplateCode.Contains(t.TemplateCode));
        var initStringTemplate = new List<StringTemplate>
        {
            new()
            {
                UserId = user.Id,
                TemplateName = "基础模板",
                TemplateCode = "Base",
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = [new TemplateParseObject { VariableName = "content", JsonPath = "$.content" }],
                    TemplateText = "{{ content }}"
                }
            },
            new()
            {
                UserId = user.Id,
                TemplateName = "飞书",
                TemplateCode = nameof(ChannelEnum.Lark),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = [new TemplateParseObject { VariableName = "text", JsonPath = "$.content.text" }],
                    TemplateText = "{{ text }}"
                }
            },
            new()
            {
                UserId = user.Id,
                TemplateName = "钉钉",
                TemplateCode = nameof(ChannelEnum.DingTalk),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = [new TemplateParseObject { VariableName = "content", JsonPath = "$.text.content" }],
                    TemplateText = "{{ content }}"
                }
            },
            new()
            {
                UserId = user.Id,
                TemplateName = "企业微信",
                TemplateCode = nameof(ChannelEnum.ComWechat),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = [new TemplateParseObject { VariableName = "content", JsonPath = "$.text.content" }],
                    TemplateText = "{{ content }}"
                }
            }
        };

        return await _repStringTemplate.InsertRangeAsync(initStringTemplate);
    }
}
