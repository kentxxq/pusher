namespace pusher.webapi.Models.SO;

public class ChannelJoinedRoomsSO
{
    public int Id { get; set; }
    public string RoomName { get; set; } = null!;
    public string RoomCode { get; set; }
    public int UserId { get; set; } = 1;
    public DateTimeOffset CreateDate { get; set; }
}
