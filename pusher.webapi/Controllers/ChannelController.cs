using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Extensions;
using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using pusher.webapi.Models.SO;
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
    public async Task<ResultModel<PageDataModel<Channel>>> GetUserChannelsWithPage([FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10)
    {
        var data = await _channelService.GetUserChannelsWithPage(HttpContext.User.GetUserId(), pageIndex, pageSize);
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
    /// <param name="updateChannelRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<bool>> UpdateChannel(UpdateChannelRO updateChannelRO)
    {
        var channel = await _channelService.GetUserChannelByChannelId(HttpContext.User.GetUserId(), updateChannelRO.Id);
        // 只允许删除自己的房间
        if (channel is null)
        {
            throw new PusherException("无法修改此channel");
        }

        MyMapper.MergeUpdateChannelROToChannel(updateChannelRO, channel);
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

    [HttpGet]
    public async Task<ResultModel<List<ChannelJoinedRoomsSO>>> GetChannelJoinedRooms(int channelId)
    {
        if (!await _channelService.IsChannelBelongsToUser(channelId, HttpContext.User.GetUserId()))
        {
            return ResultModel.Error("没有权限发送消息", new List<ChannelJoinedRoomsSO>());
        }

        var data = await _channelService.GetChannelJoinedRooms(channelId);
        var result = data.Select(MyMapper.RoomToChannelJoinedRoomsSO).ToList();
        return ResultModel.Ok(result);
    }

    [HttpGet]
    public async Task<ResultModel<List<ChannelMessageHistorySO>>> GetChannelMessageHistory(int channelId)
    {
        if (!await _channelService.IsChannelBelongsToUser(channelId, HttpContext.User.GetUserId()))
        {
            return ResultModel.Error("没有权限查询信息", new List<ChannelMessageHistorySO>());
        }

        var channelMessageHistories = await _channelService.GetChannelMessageHistory(channelId);
        var messages =
            await _channelService.GetMessageByMessageIds(channelMessageHistories.Select(h => h.MessageId).ToList());
        var data = channelMessageHistories.Select(h => new ChannelMessageHistorySO
        {
            Id = h.Id,
            MessageType = messages.FirstOrDefault(m => m.Id == h.MessageId)?.MessageType ?? MessageEnum.Text,
            Content = messages.FirstOrDefault(m => m.Id == h.MessageId)?.Content ?? string.Empty,
            RecordTime = messages.FirstOrDefault(m => m.Id == h.MessageId)?.RecordTime ?? DateTime.Now,
            Status = h.Status,
            Success = h.Success,
            Result = h.Result
        }).ToList();
        return ResultModel.Ok(data);
    }
}
