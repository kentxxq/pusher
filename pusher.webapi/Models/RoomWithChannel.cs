using SqlSugar;

namespace pusher.webapi.Models;

[SugarTable(nameof(RoomWithChannel), "房间-管道")]
public class RoomWithChannel
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "房间id")]
    public int RoomId { get; set; }

    [SugarColumn(ColumnDescription = "管道id")]
    public int ChannelId { get; set; }
}
