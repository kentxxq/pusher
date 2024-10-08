﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Extensions;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using pusher.webapi.Models.SO;
using pusher.webapi.Service;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Controllers;

/// <summary>
///     管理员接口
/// </summary>
[Authorize(Roles = nameof(RoleType.Admin))]
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class AdminController : ControllerBase
{
    private readonly ChannelService _channelService;
    private readonly DashboardService _dashboardService;
    private readonly DBService _dbService;
    private readonly ILogger<DashboardController> _logger;
    private readonly RoomService _roomService;
    private readonly UserService _userService;

    public AdminController(DBService dbService, UserService userService, ILogger<DashboardController> logger,
        DashboardService dashboardService, ChannelService channelService, RoomService roomService)
    {
        _dbService = dbService;
        _userService = userService;
        _logger = logger;
        _dashboardService = dashboardService;
        _channelService = channelService;
        _roomService = roomService;
    }

    /// <summary>
    ///     重置数据库
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<string>> ResetDatabase()
    {
        _dbService.ResetDatabase();
        var userId = await _dbService.CreateAdminUser();
        await _userService.InitUserData(userId);
        var result = await _dbService.ResetSystemStringTemplates();
        return result ? ResultModel.Ok("重置系统模板成功") : ResultModel.Error("重置失败", string.Empty);
    }

    /// <summary>
    ///     重置系统模板
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<string>> ResetSystemStringTemplates()
    {
        var result = await _dbService.ResetSystemStringTemplates();
        return result ? ResultModel.Ok("重置系统模板成功") : ResultModel.Error("重置失败", string.Empty);
    }

    /// <summary>
    ///     获取所有用户
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<PageDataModel<User>>> GetUsersWithPage([FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10)
    {
        return ResultModel.Ok(await _userService.GetUsersWithPage(pageIndex, pageSize));
    }

    /// <summary>
    ///     修改用户角色
    /// </summary>
    /// <param name="updateUserRoleRO"></param>
    /// <returns></returns>
    /// <exception cref="PusherException"></exception>
    [HttpPost]
    public async Task<ResultModel<string>> UpdateUserRole(UpdateUserRoleRO updateUserRoleRO)
    {
        var user = await _userService.GetUserByUsername(updateUserRoleRO.Username);
        if (user is null)
        {
            throw new PusherException("用户不存在");
        }

        user.RoleType = updateUserRoleRO.RoleType;
        return ResultModel.Ok(await _userService.UpdateUser(user) ? "修改成功" : "修改失败");
    }

    /// <summary>
    ///     创建用户
    /// </summary>
    /// <param name="createUserRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> CreateUser(CreateUserRO createUserRO)
    {
        var userId = await _userService.CreateUser(createUserRO.Username, createUserRO.Password,
            createUserRO.RoleType);
        await _userService.InitUserData(userId);
        return ResultModel.Ok(userId);
    }

    /// <summary>
    ///     删除用户
    /// </summary>
    /// <param name="deleteIdList"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> DeleteUser(List<int> deleteIdList)
    {
        var count = await _userService.DeleteUser(deleteIdList);
        return ResultModel.Ok(count);
    }

    /// <summary>
    ///     最近每天的请求数
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<DateCountSO>>> GetRecentMessageCountGroupByDay(int days)
    {
        // 查出所有的消息
        var messages = await _dashboardService.GetAllMessagesInDays(days);
        var data = messages.GroupBy(m => m.RecordTime.Date)
            .Select(g => new DateCountSO
            {
                // 不指定时区,不指定DateTimeKind为utc. 直接把datetime赋值给datetimeoffset,默认会加上服务器的时区
                Date = g.Key,
                Count = g.Count()
            })
            .ToList();

        // 如果没有当天的数据,就设置成0
        var dates = Enumerable.Range(0, days)
            .Select(i => DateTimeOffset.Now.AddDays(-i))
            .ToList();
        foreach (var date in dates)
        {
            if (!data.Select(r => r.Date.Date).Contains(date.Date))
            {
                data.Add(new DateCountSO { Date = date, Count = 0 });
            }
        }

        var result = data.OrderBy(r => r.Date).ToList();
        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     最近每个用户的请求数
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<TypeIntValueSO>>> GetRecentMessageCountGroupByUser(int days)
    {
        var usernames = await _dashboardService.GetRecentMessageUsername(days);
        var result = usernames.GroupBy(u => u)
            .Select(g => new TypeIntValueSO { Name = g.Key, Value = g.Count() })
            .ToList();

        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     各管道类型数量
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<TypeIntValueSO>>> GetChannelCountGroupByChannelType()
    {
        var channels = await _channelService.GetChannels();
        var result = channels.GroupBy(c => c.ChannelType)
            .Select(g => new TypeIntValueSO
            {
                Name = g.Key.GetDisplayName(),
                Value = g.Count()
            })
            .OrderByDescending(g => g.Value)
            .ToList();

        return ResultModel.Ok(result);
    }
}
