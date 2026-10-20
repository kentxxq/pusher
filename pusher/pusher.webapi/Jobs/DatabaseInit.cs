using pusher.webapi.Service.Database;
using Quartz;

namespace pusher.webapi.Jobs;

/// <summary>
///     数据库初始化
/// </summary>
public class DatabaseInit : IJob
{
    private readonly DBService _dbService;
    private readonly ILogger<DatabaseInit> _logger;
    private readonly IWebHostEnvironment _webHostEnvironment;

    public DatabaseInit(ILogger<DatabaseInit> logger, IWebHostEnvironment webHostEnvironment, DBService dbService)
    {
        _logger = logger;
        _webHostEnvironment = webHostEnvironment;
        _dbService = dbService;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation($"开始任务{nameof(DatabaseInit)}");

        // 仅开发环境进行初始化和数据同步
        if (_webHostEnvironment.IsDevelopment())
        {
            await _dbService.InitAndSyncDatabase();
        }
    }
}
