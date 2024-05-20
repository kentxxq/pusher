using pusher.webapi.Common;
using SqlSugar;

namespace pusher.webapi.Models;

[SugarTable(nameof(Message), "消息表")]
public class Message
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "消息类型")]
    public MessageEnum MessageType { get; set; }

    [SugarColumn(Length = 2000, ColumnDescription = "消息内容")]
    public string Content { get; set; } = null!;

    [SugarColumn(ColumnDescription = "消息注释")]
    public string Comment { get; set; } = null!;

    [SugarColumn(ColumnDescription = "收到消息的时间")]
    public DateTime? RecordTime { get; set; }

    [SugarColumn(ColumnDescription = "房间id")]
    public int RoomId { get; set; }
}
