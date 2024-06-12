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
    private readonly DashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(ILogger<DashboardController> logger, DashboardService dashboardService)
    {
        _logger = logger;
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<ResultModel<List<DateCountSO>>> GetRecentMessageCountGroupByDay(int days)
    {
        // 查出用户的数据
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
}
