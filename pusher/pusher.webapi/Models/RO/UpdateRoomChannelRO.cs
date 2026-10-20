namespace pusher.webapi.Models.RO;

public class UpdateRoomChannelRO
{
    public int RoomId { get; set; }
    public List<int> ChannelIds { get; set; }
}
