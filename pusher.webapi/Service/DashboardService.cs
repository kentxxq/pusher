using pusher.webapi.Models.DB;
using pusher.webapi.Models.SO;
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
        // 特定天数内的消息
        var data = messages.Where(m => m.RecordTime > DateTime.Now - TimeSpan.FromDays(days))
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
        // 特定天数内的消息
        var messages = await _repMessage.GetListAsync(m => m.RecordTime > DateTime.Now - TimeSpan.FromDays(days)) ?? [];
        return messages;
    }

    public async Task<List<TypeIntValueSO>> GetRecentMessageCountGroupByUser(int days)
    {
        var data1 = await _sqlSugarClient.Queryable<Message>()
            .LeftJoin<Room>((m, r) => m.RoomId == r.Id)
            .LeftJoin<User>((m, r, u) => r.UserId == u.Id)
            .Where(m => m.RecordTime > DateTime.Now - TimeSpan.FromDays(days))
            .Select((m, r, u) => new { u.Username, m.Id })
            .ToListAsync();

        var data2 = data1
            .GroupBy(u => u.Username)
            .Select(g => new TypeIntValueSO
            {
                Name = g.Key,
                Value = g.Count()
            })
            .ToList();

        return data2;
    }
}
