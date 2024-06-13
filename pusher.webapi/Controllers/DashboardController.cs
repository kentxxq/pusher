using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Extensions;
using pusher.webapi.Models.SO;
using pusher.webapi.Service;

namespace pusher.webapi.Controllers;

/// <summary>
///     图表入口
/// </summary>
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class DashboardController : ControllerBase
{
    private readonly ChannelService _channelService;
    private readonly DashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;
    private readonly RoomService _roomService;

    public DashboardController(ILogger<DashboardController> logger, DashboardService dashboardService,
        RoomService roomService, ChannelService channelService)
    {
        _logger = logger;
        _dashboardService = dashboardService;
        _roomService = roomService;
        _channelService = channelService;
    }

    /// <summary>
    ///     最近每天的请求数
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<DateCountSO>>> GetRecentMessageCountGroupByDay(int days)
    {
        // 查出用户的消息
        var messages = await _dashboardService.GetUserMessagesInDays(HttpContext.User.GetUserId(), days);
        var data = messages.GroupBy(m => m.RecordTime.Date.AddHours(-8))
            .Select(g => new DateCountSO
            {
                Date = g.Key.ToLocalTime(),
                Count = g.Count()
            })
            .ToList();

        // 如果没有当天的数据,就设置成0
        var dates = Enumerable.Range(0, days)
            .Select(i => DateTime.Today.AddDays(-i).Date)
            .ToList();
        foreach (var date in dates)
        {
            if (!data.Select(r => r.Date).Contains(date))
            {
                data.Add(new DateCountSO { Date = date.Date, Count = 0 });
            }
        }

        var result = data.OrderBy(r => r.Date).ToList();
        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     最近每个房间的请求数
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<TypeIntValueSO>>> GetRecentMessageCountGroupByRoom(int days)
    {
        // 查出用户的消息
        var messages = await _dashboardService.GetUserMessagesInDays(HttpContext.User.GetUserId(), days);
        var data = messages.GroupBy(m => m.RoomId)
            .Select(g => new
            {
                Name = g.Key,
                value = g.Count()
            })
            .ToList();

        // 把roomId改成房间名
        var rooms = await _roomService.GetRoomsByUserID(HttpContext.User.GetUserId());
        var result = data.Select(item => new TypeIntValueSO
                { Name = rooms.First(r => r.Id == item.Name).RoomName, Value = item.value })
            .OrderByDescending(r => r.Value)
            .ToList();

        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     最近每个管道的请求数
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<TypeIntValueSO>>> GetRecentMessageCountGroupByChannel(int days)
    {
        // 查出用户的管道历史记录
        var channelMessageHistories =
            await _dashboardService.GetUserChannelHistoriesInDays(HttpContext.User.GetUserId(), days);
        var data = channelMessageHistories.GroupBy(h => h.ChannelId)
            .Select(g => new
            {
                Name = g.Key,
                Value = g.Count()
            })
            .ToList();

        // 把管道id变成管道名
        var channels = await _channelService.GetUserChannels(HttpContext.User.GetUserId());
        var result = data.Select(item => new TypeIntValueSO
                { Name = channels.First(c => c.Id == item.Name).ChannelName, Value = item.Value })
            .OrderByDescending(r => r.Value)
            .ToList();

        return ResultModel.Ok(result);
    }
}
