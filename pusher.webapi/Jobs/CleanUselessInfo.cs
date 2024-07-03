using pusher.webapi.Common;
using pusher.webapi.Models.DB;
using pusher.webapi.Service;
using pusher.webapi.Service.Database;
using Quartz;

namespace pusher.webapi.Jobs;

/// <summary>
///     删除无用的信息
/// </summary>
public class CleanUselessInfo : IJob
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<CleanUselessInfo> _logger;
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<User> _repUser;
    private readonly UserService _userService;

    /// <summary>
    ///     依赖注入
    /// </summary>
    /// <param name="logger"></param>
    public CleanUselessInfo(ILogger<CleanUselessInfo> logger, UserService userService, Repository<User> repUser,
        IConfiguration configuration, Repository<Message> repMessage,
        Repository<ChannelMessageHistory> repChannelMessageHistory)
    {
        _logger = logger;
        _userService = userService;
        _repUser = repUser;
        _configuration = configuration;
        _repMessage = repMessage;
        _repChannelMessageHistory = repChannelMessageHistory;
    }

    /// <summary>
    ///     job的执行入口
    /// </summary>
    /// <param name="context"></param>
    /// <returns></returns>
    public async Task Execute(IJobExecutionContext context)
    {
        await DeleteUselessUser();
        await DeleteTestUserData();
        await DeleteExpiredMessage();
    }

    /// <summary>
    ///     删除没有登录过的用户
    /// </summary>
    private async Task DeleteUselessUser()
    {
        var users = await _userService.GetUsers();
        var deleteUsers = users.Where(u => u.LastLoginTime is null).ToList();
        if (deleteUsers.Count > 0)
        {
            var deleteCount = await _userService.DeleteUser(deleteUsers.Select(u => u.Id).ToList());
            _logger.LogWarning($"已删除{deleteCount}个用户:{string.Join(",", deleteUsers.Select(u => u.Username).ToList())}");
        }
    }

    /// <summary>
    ///     删除test用户的相关数据
    /// </summary>
    public async Task DeleteTestUserData()
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == "test");
        await _userService.DeleteUserData(user.Id);
        await _userService.InitUserData(user.Id);
        _logger.LogWarning("已删除test用户的相关数据");
    }

    /// <summary>
    ///     清理过期的消息
    /// </summary>
    private async Task DeleteExpiredMessage()
    {
        var messageRetentionPeriod =
            _configuration.GetSection(DataOptions.Data).Get<DataOptions>()!.MessageRetentionPeriod;
        var expiredMessageId =
            await _repMessage.GetListAsync(m => (DateTime.Now - m.RecordTime).Days > messageRetentionPeriod);

        await _repMessage.DeleteAsync(m => expiredMessageId.Select(e => e.Id).Contains(m.Id));
        await _repChannelMessageHistory.DeleteAsync(c => expiredMessageId.Select(e => e.Id).Contains(c.MessageId));
        _logger.LogWarning($"已清理超过{messageRetentionPeriod}天的消息记录");
    }
}
