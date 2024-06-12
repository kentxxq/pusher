using pusher.webapi.Models.DB;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service;

public class DashboardService
{
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;

    public DashboardService(Repository<Message> repMessage, Repository<Room> repRoom)
    {
        _repMessage = repMessage;
        _repRoom = repRoom;
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
}
