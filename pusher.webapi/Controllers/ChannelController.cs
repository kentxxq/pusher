using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Models;
using pusher.webapi.RO;
using pusher.webapi.Service;

namespace pusher.webapi.Controllers;

/// <summary>
///     消息入口
/// </summary>
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class ChannelController : ControllerBase
{
    private readonly ChannelService _channelService;
    private readonly ILogger<RoomController> _logger;

    public ChannelController(ILogger<RoomController> logger, ChannelService channelService)
    {
        _logger = logger;
        _channelService = channelService;
    }

    /// <summary>
    ///     获取用户管道
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<Channel>>> GetUserChannels()
    {
        var data = await _channelService.GetUserChannels(HttpContext.User.GetUserId());
        return ResultModel.Ok(data);
    }

    /// <summary>
    ///     创建管道
    /// </summary>
    /// <param name="createChannelRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> CreateChannel(CreateChannelRO createChannelRO)
    {
        var channel = MyMapper.CreateChannelROToChannel(createChannelRO);
        channel.UserId = HttpContext.User.GetUserId();
        var data = await _channelService.CreateChannel(channel);
        return ResultModel.Ok(data);
    }

    /// <summary>
    ///     删除管道
    /// </summary>
    /// <param name="channelIdList"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<bool>> DeleteChannel(List<int> channelIdList)
    {
        // 只允许删除自己的房间
        var userRooms = await _channelService.GetUserChannels(HttpContext.User.GetUserId());
        var deleteRoomId = channelIdList.Where(id => userRooms.Select(r => r.Id).Contains(id)).ToList();
        var data = await _channelService.DeleteChannel(deleteRoomId);
        return ResultModel.Ok(data);
    }

    /// <summary>
    ///     更新管道
    /// </summary>
    /// <param name="channel"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<bool>> UpdateChannel(Channel channel)
    {
        // 只允许删除自己的房间
        if (!await _channelService.IsChannelBelongsToUser(channel.Id, HttpContext.User.GetUserId()))
        {
            throw new PusherException("没有权限修改不属于你的管道");
        }

        var data = await _channelService.UpdateChannel(channel);
        return ResultModel.Ok(data);
    }

    /// <summary>
    ///     发送测试信息到channel
    /// </summary>
    /// <param name="channelId"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<bool>> SendTestMessageToChannel(int channelId)
    {
        if (!await _channelService.IsChannelBelongsToUser(channelId, HttpContext.User.GetUserId()))
        {
            return ResultModel.Error("没有权限发送消息", false);
        }

        var result = await _channelService.SendTestMessageToChannel(channelId);
        return result.IsSuccess ? ResultModel.Ok(true) : ResultModel.Error($"发送失败:{result.Message}", false);
    }
}
