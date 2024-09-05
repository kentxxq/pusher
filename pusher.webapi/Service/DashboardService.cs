using pusher.webapi.Models.DB;
using pusher.webapi.Service.Database;
using SqlSugar;

namespace pusher.webapi.Service;

public class DashboardService
{
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;
    private readonly ISqlSugarClient _sqlSugarClient;

    public DashboardService(Repository<Message> repMessage, Repository<Room> repRoom,
        Repository<ChannelMessageHistory> repChannelMessageHistory, ISqlSugarClient sqlSugarClient)
    {
        _repMessage = repMessage;
        _repRoom = repRoom;
        _repChannelMessageHistory = repChannelMessageHistory;
        _sqlSugarClient = sqlSugarClient;
    }

    public async Task<List<Message>> GetUserMessages(int userId)
    {
        var rooms = await _repRoom.GetListAsync(r => r.UserId == userId) ?? [];
        var messages = await _repMessage.GetListAsync(m => rooms.Select(r => r.Id).Contains(m.RoomId)) ?? [];
        return messages;
    }

    public async Task<List<Message>> GetUserMessagesInDays(int userId, int days)
    {
        var messages = await GetUserMessages(userId);
        // 带入linq会生成错误的时间,应该要在c#代码中先计算出来
        var targetDate = DateTimeOffset.Now - TimeSpan.FromDays(days);
        // 特定天数内的消息
        var data = messages.Where(m => m.RecordTime > targetDate)
            .ToList();
        return data;
    }

    public async Task<List<ChannelMessageHistory>> GetUserChannelHistoriesInDays(int userId, int days)
    {
        var messages = await GetUserMessagesInDays(userId, days);
        var channelMessageHistories =
            await _repChannelMessageHistory.GetListAsync(h => messages.Select(m => m.Id).Contains(h.MessageId));
        return channelMessageHistories;
    }

    public async Task<List<Message>> GetAllMessagesInDays(int days)
    {
        // 带入linq会生成错误的时间,应该要在c#代码中先计算出来
        var targetDate = DateTimeOffset.Now - TimeSpan.FromDays(days);
        // 特定天数内的消息
        var messages = await _repMessage.GetListAsync(m => m.RecordTime > targetDate) ?? [];
        return messages;
    }

    /// <summary>
    ///     最近特定天数内,所有消息的用户名
    /// </summary>
    /// <param name="days"></param>
    /// <returns></returns>
    public async Task<List<string>> GetRecentMessageUsername(int days)
    {
        // 带入linq会生成错误的时间,应该要在c#代码中先计算出来
        var targetDate = DateTimeOffset.Now - TimeSpan.FromDays(days);
        // 这里比较复杂,不适合用rep来写
        // 查询最近所有消息,然后返回对应的用户名
        var data = await _sqlSugarClient.Queryable<Message>()
            .LeftJoin<Room>((m, r) => m.RoomId == r.Id)
            .LeftJoin<User>((m, r, u) => r.UserId == u.Id)
            .Where(m => m.RecordTime > targetDate)
            .Select((m, r, u) => u.Username)
            .ToListAsync();

        return data;
    }
}
