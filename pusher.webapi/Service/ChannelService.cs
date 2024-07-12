using pusher.webapi.Common;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.ChannelHandler;
using pusher.webapi.Service.Database;
using SqlSugar;

namespace pusher.webapi.Service;

public class ChannelService
{
    private readonly IEnumerable<IChannelHandler> _channelHandlers;
    private readonly Repository<Channel> _repChannel;
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;
    private readonly Repository<RoomWithChannel> _repRoomWithChannel;

    public ChannelService(Repository<Channel> repChannel, IEnumerable<IChannelHandler> channelHandlers,
        Repository<RoomWithChannel> repRoomWithChannel, Repository<Room> repRoom,
        Repository<ChannelMessageHistory> repChannelMessageHistory, Repository<Message> repMessage)
    {
        _repChannel = repChannel;
        _channelHandlers = channelHandlers;
        _repRoomWithChannel = repRoomWithChannel;
        _repRoom = repRoom;
        _repChannelMessageHistory = repChannelMessageHistory;
        _repMessage = repMessage;
    }

    /// <summary>
    ///     获取所有channel
    /// </summary>
    /// <returns></returns>
    public async Task<List<Channel>> GetChannels()
    {
        var data = await _repChannel.GetListAsync() ?? [];
        return data;
    }

    /// <summary>
    ///     获取用户channel
    /// </summary>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<PageDataModel<Channel>> GetUserChannelsWithPage(int userId, int pageIndex, int pageSize)
    {
        var p = StaticTools.CreatePageModel(pageIndex, pageSize);
        var data = await _repChannel.GetPageListAsync(c => c.UserId == userId, p, c => c.Id, OrderByType.Asc) ?? [];
        return PageDataModel.Ok(data, p);
    }

    /// <summary>
    ///     获取用户所有channel
    /// </summary>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<List<Channel>> GetUserChannels(int userId)
    {
        var data = await _repChannel.GetListAsync(c => c.UserId == userId) ?? [];
        return data;
    }

    /// <summary>
    ///     通过channelId获取用户channel
    /// </summary>
    /// <param name="userId"></param>
    /// <param name="channelId"></param>
    /// <returns></returns>
    public async Task<Channel> GetUserChannelByChannelId(int userId, int channelId)
    {
        var data = await _repChannel.GetFirstAsync(c => c.UserId == userId && c.Id == channelId);
        return data;
    }

    /// <summary>
    ///     增
    /// </summary>
    /// <param name="channel"></param>
    /// <returns></returns>
    public async Task<int> CreateChannel(Channel channel)
    {
        return await _repChannel.InsertReturnIdentityAsync(channel);
    }

    /// <summary>
    ///     删
    /// </summary>
    /// <param name="channelIdList"></param>
    /// <returns></returns>
    public async Task<bool> DeleteChannel(List<int> channelIdList)
    {
        await _repRoomWithChannel.DeleteAsync(r => channelIdList.Contains(r.ChannelId));
        await _repChannelMessageHistory.DeleteAsync(h => channelIdList.Contains(h.ChannelId));
        return await _repChannel.DeleteByIdsAsync(channelIdList.Cast<object>().ToArray());
    }

    /// <summary>
    ///     改
    /// </summary>
    /// <param name="channel"></param>
    /// <returns></returns>
    public async Task<bool> UpdateChannel(Channel channel)
    {
        return await _repChannel.UpdateAsync(channel);
    }


    /// <summary>
    ///     管道是否属于此用户
    /// </summary>
    /// <param name="channelId"></param>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<bool> IsChannelBelongsToUser(int channelId, int userId)
    {
        var channel = await _repChannel.GetByIdAsync(channelId);
        return channel.UserId == userId;
    }

    /// <summary>
    ///     发送测试消息到此管道
    /// </summary>
    /// <param name="channelId"></param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    public async Task<HandlerResult> SendTestMessageToChannel(int channelId)
    {
        var channel = await _repChannel.GetByIdAsync(channelId);
        var handler = _channelHandlers.FirstOrDefault(c => c.CanHandle(channel.ChannelType));
        if (handler is null)
        {
            throw new Exception("没有找到合适的管道处理");
        }

        return await handler.HandleText(channel.ChannelUrl, "测试验证\nby pusher", channel.ChannelProxyUrl ?? string.Empty);
    }

    /// <summary>
    ///     获取管道加入的房间
    /// </summary>
    /// <param name="channelId"></param>
    /// <returns></returns>
    public async Task<List<Room>> GetChannelJoinedRooms(int channelId)
    {
        var rList = await _repRoomWithChannel.GetListAsync(r => r.ChannelId == channelId) ?? [];
        return await _repRoom.GetListAsync(room => rList.Select(r => r.RoomId).Contains(room.Id));
    }

    public async Task<List<ChannelMessageHistory>> GetChannelMessageHistory(int channelId)
    {
        var channelMessageHistories = await _repChannelMessageHistory.GetListAsync(c => c.ChannelId == channelId) ?? [];
        return channelMessageHistories;
    }

    public async Task<PageDataModel<ChannelMessageHistory>> GetChannelMessageHistoryWithPage(int channelId,
        int pageIndex, int pageSize)
    {
        var p = StaticTools.CreatePageModel(pageIndex, pageSize);
        var channelMessageHistories =
            await _repChannelMessageHistory.GetPageListAsync(h => h.ChannelId == channelId, p, h => h.Id,
                OrderByType.Desc) ?? [];
        return PageDataModel.Ok(channelMessageHistories, p);
    }

    public async Task<List<Message>> GetMessageByMessageIds(List<int> messageIds)
    {
        var message = await _repMessage.GetListAsync(m => messageIds.Contains(m.Id)) ?? [];
        return message;
    }
}
