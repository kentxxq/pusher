using pusher.webapi.Enums;

namespace pusher.webapi.Models.SO;

public class RoomMessageHistorySO
{
    public int Id { get; set; }

    public MessageEnum MessageType { get; set; }

    public string Content { get; set; } = null!;

    public DateTime RecordTime { get; set; }
}
