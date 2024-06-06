using pusher.webapi.Models.DB;
using pusher.webapi.Service.ChannelHandler;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service;

public class ChannelService
{
    private readonly IEnumerable<IChannelHandler> _channelHandlers;
    private readonly Repository<Channel> _repChannel;
    private readonly Repository<Room> _repRoom;
    private readonly Repository<RoomWithChannel> _repRoomWithChannel;

    public ChannelService(Repository<Channel> repChannel, IEnumerable<IChannelHandler> channelHandlers,
        Repository<RoomWithChannel> repRoomWithChannel, Repository<Room> repRoom)
    {
        _repChannel = repChannel;
        _channelHandlers = channelHandlers;
        _repRoomWithChannel = repRoomWithChannel;
        _repRoom = repRoom;
    }

    public async Task<List<Channel>> GetUserChannels(int userId)
    {
        var data = await _repChannel.GetListAsync(c => c.UserId == userId) ?? [];
        return data;
    }

    public async Task<Channel> GetUserChannelByChannelId(int userId, int channelId)
    {
        var data = await _repChannel.GetFirstAsync(c => c.UserId == userId && c.Id == channelId);
        return data;
    }

    public async Task<int> CreateChannel(Channel channel)
    {
        return await _repChannel.InsertReturnIdentityAsync(channel);
    }

    public async Task<bool> DeleteChannel(List<int> channelIdList)
    {
        await _repRoomWithChannel.DeleteAsync(r => channelIdList.Contains(r.ChannelId));
        return await _repChannel.DeleteByIdsAsync(channelIdList.Cast<object>().ToArray());
    }

    public async Task<bool> UpdateChannel(Channel channel)
    {
        return await _repChannel.UpdateAsync(channel);
    }


    public async Task<bool> IsChannelBelongsToUser(int channelId, int userId)
    {
        var channel = await _repChannel.GetByIdAsync(channelId);
        return channel.UserId == userId;
    }

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

    public async Task<List<Room>> GetChannelJoinedRooms(int channelId)
    {
        var rList = await _repRoomWithChannel.GetListAsync(r => r.ChannelId == channelId) ?? [];
        return await _repRoom.GetListAsync(room => rList.Select(r => r.RoomId).Contains(room.Id));
    }
}
