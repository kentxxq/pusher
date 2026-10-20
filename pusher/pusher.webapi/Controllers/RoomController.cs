using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
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
public class RoomController : ControllerBase
{
    private readonly ChannelService _channelService;
    private readonly ILogger<RoomController> _logger;
    private readonly RoomService _roomService;

    /// <inheritdoc />
    public RoomController(ILogger<RoomController> logger,
        RoomService roomService, ChannelService channelService)
    {
        _logger = logger;
        _roomService = roomService;
        _channelService = channelService;
    }

    /// <summary>
    ///     使用get请求,但不支持使用 \n 来换行
    /// </summary>
    /// <param name="roomCode"></param>
    /// <param name="content"></param>
    /// <param name="roomKey"></param>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet("{roomCode}")]
    public async Task<ResultModel<string>> SendMessageByGet([FromRoute] [Required] string roomCode,
        [FromQuery] [Required] string content, [FromQuery] string roomKey = "")
    {
        var extraParams = GetExtraParams(["content", "roomKey"]);
        var result = await _roomService.HandleMessage(roomCode, roomKey,
            new MessageInfo { Content = content, ExtraParams = extraParams });
        return ResultModel.Ok($"房间{roomCode}接收请求：{result}");
    }

    /// <summary>
    ///     post发送信息
    /// </summary>
    /// <param name="roomCode"></param>
    /// <param name="data"></param>
    /// <param name="roomKey"></param>
    /// <param name="messageType"></param>
    /// <param name="templateCode"></param>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpPost("{roomCode}")]
    public async Task<ResultModel<string>> SendMessageByPost(
        [FromRoute] string roomCode,
        [FromBody] [Required] JsonElement data,
        [FromQuery] string roomKey = "",
        [FromQuery] string templateCode = "",
        [FromQuery] MessageEnum messageType = MessageEnum.Text
    )
    {
        // Bark 支持的所有透传参数白名单
        var allowExtraKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "title", "group", "icon", "sound", "url", "isArchive", "level", "badge", "autoCopy", "copy", "volume"
        };

        // 1. 先从 URL 获取透传参数 (排除系统参数)
        var extraParams = GetExtraParams(["roomKey", "templateCode", "messageType"]);

        // 2. 过滤掉不在白名单中的 URL 参数
        foreach (var key in extraParams.Keys.ToList())
        {
            if (!allowExtraKeys.Contains(key))
            {
                extraParams.Remove(key);
            }
        }

        object content = data; // 默认整个 body 作为 content
        if (data.ValueKind == JsonValueKind.Object)
        {
            // 尝试从 body 中提取 content 字段
            if (data.TryGetProperty("content", out var contentProp))
            {
                content = contentProp.ToString();
            }

            // 3. 从 POST body 中提取白名单参数（Body 参数优先级高，覆盖同名 URL 参数）
            foreach (var prop in data.EnumerateObject())
            {
                if (allowExtraKeys.Contains(prop.Name))
                {
                    extraParams[prop.Name] = prop.Value.ToString();
                }
            }
        }

        var result = await _roomService.HandleMessage(roomCode, roomKey,
            new MessageInfo
            {
                MessageType = messageType,
                Content = content,
                TemplateCode = templateCode,
                ExtraParams = extraParams
            });
        return ResultModel.Ok($"房间{roomCode}接收请求：{result}");
    }

    private Dictionary<string, object> GetExtraParams(string[] excludeKeys)
    {
        var extraParams = new Dictionary<string, object>();
        foreach (var key in HttpContext.Request.Query.Keys)
        {
            if (!excludeKeys.Contains(key))
            {
                extraParams[key] = HttpContext.Request.Query[key].ToString();
            }
        }

        return extraParams;
    }

    /// <summary>
    ///     获取用户room
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<PageDataModel<Room>>> GetRoomsWithPage([FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _roomService.GetRoomsByUserIDWithPage(HttpContext.User.GetUserId(), pageIndex, pageSize);
        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     创建一个room
    /// </summary>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> CreateRoom(CreateRoomRO createRoomRO)
    {
        if (await _roomService.GetRoomByRoomCode(createRoomRO.RoomCode) is not null)
        {
            throw new PusherException($"创建{createRoomRO.RoomName}失败,{createRoomRO.RoomCode}已经存在了");
        }

        var result = await _roomService.CreateRoom(HttpContext.User.GetUserId(), createRoomRO.RoomName,
            createRoomRO.RoomCode, createRoomRO.RoomKey);
        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     删除room
    /// </summary>
    /// <param name="roomIdList"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> DeleteRoom(List<int> roomIdList)
    {
        // 只允许删除自己的房间
        var userRooms = await _roomService.GetRoomsByUserID(HttpContext.User.GetUserId());
        var deleteRoomId = roomIdList.Where(id => userRooms.Select(r => r.Id).Contains(id)).ToList();
        // 开始删除
        await _roomService.DeleteRoom(deleteRoomId);
        return ResultModel.Ok(deleteRoomId.Count);
    }

    /// <summary>
    ///     修改room
    /// </summary>
    /// <param name="updateRoomRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<string>> UpdateRoom(UpdateRoomRO updateRoomRO)
    {
        var room = await _roomService.GetRoomByRoomId(updateRoomRO.Id);
        if (room is null || room.UserId != HttpContext.User.GetUserId())
        {
            throw new PusherException("修改失败");
        }

        var tmpSameCodeRoom = await _roomService.GetRoomByRoomCode(updateRoomRO.RoomCode);
        if (tmpSameCodeRoom is not null && tmpSameCodeRoom.Id != room.Id)
        {
            throw new PusherException("此roomCode已经存在!");
        }

        room.RoomName = updateRoomRO.RoomName;
        room.RoomCode = updateRoomRO.RoomCode;
        room.RoomKey = updateRoomRO.RoomKey;
        if (await _roomService.UpdateRoom(room))
        {
            return ResultModel.Ok("修改成功");
        }

        return ResultModel.Error("修改失败", "update数据失败");
    }


    /// <summary>
    ///     通过房间id获取加入的管道
    /// </summary>
    /// <param name="roomId"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<Channel>>> GetRoomChannels(int roomId)
    {
        List<Channel> channelIds;
        // 是自己的room
        if (await _roomService.IsRoomBelongsToUser(roomId, HttpContext.User.GetUserId()))
        {
            channelIds = await _roomService.GetChannelsByRoomId(roomId);
            return ResultModel.Ok(channelIds);
        }

        channelIds = [];
        return ResultModel.Ok(channelIds);
    }


    /// <summary>
    ///     配置房间管道
    /// </summary>
    /// <param name="updateRoomChannelRO"></param>
    /// <returns>更新后房间的管道数量</returns>
    [HttpPost]
    public async Task<ResultModel<int>> UpdateRoomChannel(UpdateRoomChannelRO updateRoomChannelRO)
    {
        // 是自己的room
        if (!await _roomService.IsRoomBelongsToUser(updateRoomChannelRO.RoomId, HttpContext.User.GetUserId()))
        {
            throw new PusherException("room不属于你");
        }

        // 用户自己的管道
        var userChannels = await _channelService.GetUserChannels(HttpContext.User.GetUserId());
        var roomChannels = updateRoomChannelRO.ChannelIds
            .Where(rc => userChannels.Select(c => c.Id).ToList().Contains(rc)).ToList();
        var result = await _roomService.UpdateRoomChannel(updateRoomChannelRO.RoomId, roomChannels);
        return ResultModel.Ok(result);
    }

    [HttpGet]
    public async Task<ResultModel<PageDataModel<RoomMessageHistorySO>>> GetRoomMessageHistoryWithPage(int roomId,
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10)
    {
        // 是自己的room
        if (!await _roomService.IsRoomBelongsToUser(roomId, HttpContext.User.GetUserId()))
        {
            throw new PusherException("room不属于你");
        }

        var data = await _roomService.GetRoomMessageHistoryWithPage(roomId, pageIndex, pageSize);
        var result = new PageDataModel<RoomMessageHistorySO>
        {
            PageIndex = data.PageIndex,
            PageSize = data.PageSize,
            TotalCount = data.TotalCount,
            PageData = data.PageData.Select(MyMapper.MessageToRoomMessageHistorySO).ToList()
        };
        return ResultModel.Ok(result);
    }
}
