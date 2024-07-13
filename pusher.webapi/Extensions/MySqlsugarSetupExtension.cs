using pusher.webapi.Service.Database;
using Serilog;
using SqlSugar;

namespace pusher.webapi.Extensions;

/// <summary>
///     sqlsugar的DI
/// </summary>
public static class MySqlsugarSetupExtension
{
    /// <summary>
    ///     拓展方法
    /// </summary>
    public static void AddSqlsugarSetup(this WebApplicationBuilder builder)
    {
        var sqlSugar = new SqlSugarScope(new ConnectionConfig
            {
                DbType = (DbType)int.Parse(builder.Configuration["Database:DbType"] ?? "0"),
                ConnectionString = builder.Configuration["Database:ConnectionString"],
                IsAutoCloseConnection = true
            },
            db =>
            {
                //单例参数配置，所有上下文生效
                db.Aop.OnLogExecuting = (sql, pars) =>
                {
                    if (builder.Environment.IsDevelopment())
                    {
                        Log.Information(sql); //输出sql
                    }
                };
            });
        builder.Services.AddSingleton<ISqlSugarClient>(sqlSugar); //这边是SqlSugarScope用AddSingleton
        builder.Services.AddScoped(typeof(Repository<>));
        builder.Services.AddTransient<DBService>();
    }
}
