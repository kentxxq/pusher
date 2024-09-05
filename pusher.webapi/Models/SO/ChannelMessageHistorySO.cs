using pusher.webapi.Enums;

namespace pusher.webapi.Models.SO;

public class ChannelMessageHistorySO
{
    public int Id { get; set; }

    public MessageEnum MessageType { get; set; }

    public string Content { get; set; } = null!;

    public DateTimeOffset RecordTime { get; set; }

    public ChannelMessageStatus Status { get; set; }

    public bool Success { get; set; } = false;

    public string? Result { get; set; }
}
