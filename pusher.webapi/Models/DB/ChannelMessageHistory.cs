using pusher.webapi.Enums;
using SqlSugar;

namespace pusher.webapi.Models.DB;

[SugarTable(nameof(ChannelMessageHistory), "管道表")]
public class ChannelMessageHistory
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "管道id")]
    public int ChannelId { get; set; }

    [SugarColumn(ColumnDescription = "消息id")]
    public int MessageId { get; set; }

    [SugarColumn(ColumnDescription = "消息处理状态")]
    public ChannelMessageStatus Status { get; set; }

    [SugarColumn(ColumnDescription = "消息处理结果")]
    public bool Success { get; set; } = false;

    [SugarColumn(IsNullable = true, ColumnDescription = "消息处理返回值")]
    public string? Result { get; set; }
}
