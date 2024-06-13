using pusher.webapi.Common;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.Database;
using pusher.webapi.Service.MessageHandler;

namespace pusher.webapi.Service;

public class RoomService
{
    private readonly ILogger<RoomService> _logger;
    private readonly IEnumerable<IMessageHandler> _messageHandlers;
    private readonly Repository<Channel> _repChannel;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;
    private readonly Repository<RoomWithChannel> _repRoomWithChannel;

    public RoomService(
        IEnumerable<IMessageHandler> messageHandlers, ILogger<RoomService> logger, Repository<Room> repRoom,
        Repository<RoomWithChannel> repRoomWithChannel, Repository<Channel> repChannel, Repository<Message> repMessage)
    {
        _messageHandlers = messageHandlers;
        _logger = logger;
        _repRoom = repRoom;
        _repRoomWithChannel = repRoomWithChannel;
        _repChannel = repChannel;
        _repMessage = repMessage;
    }

    /// <summary>
    ///     处理信息
    /// </summary>
    /// <param name="roomCode">房间号</param>
    /// <param name="roomKey">房间密钥</param>
    /// <param name="messageInfo"></param>
    /// <returns></returns>
    public async Task<bool> HandleMessage(string roomCode, string roomKey, MessageInfo messageInfo)
    {
        // 房间验证
        if (!await VerifyRoom(roomCode, roomKey))
        {
            _logger.LogWarning($"房间校验失败,roomCode:{roomCode},roomKey:{roomKey}");
            return false;
        }

        // 找到对应的处理器
        var handler = _messageHandlers.FirstOrDefault(h => h.CanHandle(messageInfo.MessageType));
        if (handler is null)
        {
            _logger.LogWarning($"无法处理此类型,messageType:{messageInfo.MessageType}");
            return false;
        }


        var messageHandlerResult = await handler.Handle(roomCode, messageInfo);
        return messageHandlerResult;
    }

    /// <summary>
    ///     验证room是否正确
    /// </summary>
    /// <param name="roomCode"></param>
    /// <param name="roomKey"></param>
    /// <returns></returns>
    public async Task<bool> VerifyRoom(string roomCode, string roomKey)
    {
        var room = await _repRoom.GetFirstAsync(r => r.RoomCode == roomCode);
        if (string.IsNullOrEmpty(room?.RoomKey))
        {
            return true;
        }

        return room.RoomKey == roomKey;
    }

    /// <summary>
    ///     获取所有房间
    /// </summary>
    /// <returns></returns>
    public async Task<List<Room>> GetRooms()
    {
        var rooms = await _repRoom.GetListAsync() ?? [];
        return rooms;
    }

    /// <summary>
    ///     获取用户所有房间
    /// </summary>
    /// <returns></returns>
    public async Task<List<Room>> GetRoomsByUserID(int userId)
    {
        var rooms = await _repRoom.GetListAsync(r => r.UserId == userId) ?? [];
        return rooms;
    }

    /// <summary>
    ///     通过roomId获取房间
    /// </summary>
    /// <returns></returns>
    public async Task<Room?> GetRoomByRoomId(int roomId)
    {
        var room = await _repRoom.GetFirstAsync(r => r.Id == roomId);
        return room;
    }

    /// <summary>
    ///     判断房间是否属于特定user
    /// </summary>
    /// <param name="roomId"></param>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<bool> IsRoomBelongsToUser(int roomId, int userId)
    {
        var room = await GetRoomByRoomId(roomId);
        return room?.UserId == userId;
    }

    /// <summary>
    ///     创建房间
    /// </summary>
    /// <param name="roomName"></param>
    /// <returns></returns>
    public async Task<int> CreateRoom(int userId, string roomName)
    {
        var room = new Room
        {
            RoomName = roomName,
            RoomCode = Guid.NewGuid().ToString("D"),
            UserId = userId,
            CreateDate = DateTime.Now
        };
        var id = await _repRoom.InsertReturnIdentityAsync(room);
        return id;
    }

    /// <summary>
    ///     删除房间
    /// </summary>
    /// <param name="roomIdList"></param>
    /// <returns></returns>
    public async Task<bool> DeleteRoom(List<int> roomIdList)
    {
        if (await _repRoom.DeleteByIdsAsync(roomIdList.Cast<object>().ToArray()))
        {
            await _repRoomWithChannel.DeleteAsync(r => roomIdList.Contains(r.RoomId));
            return true;
        }

        return false;
    }

    /// <summary>
    ///     更新房间
    /// </summary>
    /// <param name="room"></param>
    /// <returns></returns>
    public async Task<bool> UpdateRoom(Room room)
    {
        var result = await _repRoom.UpdateAsync(room);
        return result;
    }

    /// <summary>
    ///     通过房间id获取Channel
    /// </summary>
    /// <param name="roomId"></param>
    /// <returns></returns>
    public async Task<List<Channel>> GetChannelsByRoomId(int roomId)
    {
        var relationData = await _repRoomWithChannel.GetListAsync(r => r.RoomId == roomId) ?? [];
        var result = await _repChannel.GetListAsync(c => relationData.Select(r => r.ChannelId).Contains(c.Id)) ?? [];
        return result;
    }

    /// <summary>
    ///     更新房间管道
    /// </summary>
    /// <param name="roomId"></param>
    /// <param name="channelIds"></param>
    /// <returns></returns>
    public async Task<int> UpdateRoomChannel(int roomId, List<int> channelIds)
    {
        var relationData = await _repRoomWithChannel.GetListAsync(r => r.RoomId == roomId);
        var deleteIds = relationData.Where(r => !channelIds.Contains(r.ChannelId)).Select(r => r.Id).ToList();
        await _repRoomWithChannel.DeleteByIdsAsync(deleteIds.Cast<object>().ToArray());
        var addData = channelIds.Where(c => !relationData.Select(r => r.ChannelId).Contains(c)).Select(c =>
            new RoomWithChannel
            {
                RoomId = roomId,
                ChannelId = c
            }).ToList();
        await _repRoomWithChannel.InsertRangeAsync(addData);

        var result = await _repRoomWithChannel.GetListAsync(r => r.RoomId == roomId) ?? [];
        return result.Count;
    }

    public async Task<List<Message>> GetRoomMessageHistory(int roomId)
    {
        var roomMessage = await _repMessage.GetListAsync(m => m.RoomId == roomId) ?? [];
        return roomMessage;
    }

    public async Task<List<Message>> GetRoomMessageHistory(List<int> roomIds)
    {
        var roomMessage = await _repMessage.GetListAsync(m => roomIds.Contains(m.RoomId)) ?? [];
        return roomMessage;
    }
}
