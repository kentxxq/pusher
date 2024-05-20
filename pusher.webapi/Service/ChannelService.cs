using pusher.webapi.Models;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service;

public class ChannelService
{
    private readonly Repository<Channel> _repChannel;

    public ChannelService(Repository<Channel> repChannel)
    {
        _repChannel = repChannel;
    }

    public async Task<List<Channel>> GetUserChannels(int userId)
    {
        var data = await _repChannel.GetListAsync(c => c.UserId == userId) ?? [];
        return data;
    }

    public async Task<int> CreateChannel(Channel channel)
    {
        return await _repChannel.InsertReturnIdentityAsync(channel);
    }

    public async Task<bool> DeleteChannel(List<int> channelIdList)
    {
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
}
