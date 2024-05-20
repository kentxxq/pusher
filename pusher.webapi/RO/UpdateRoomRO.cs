namespace pusher.webapi.RO;

public class UpdateRoomRO
{
    public int Id { get; set; }

    public string RoomName { get; set; } = null!;

    public string RoomCode { get; set; }

    public string? RoomKey { get; set; } = null!;

    public string? CustomRoomName { get; set; } = null!;
}
