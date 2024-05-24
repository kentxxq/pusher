using pusher.webapi.Enums;
using SqlSugar;

namespace pusher.webapi.Models.DB;

[SugarTable(nameof(Channel), "管道表")]
public class Channel
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "管道名称")]
    public string ChannelName { get; set; }

    [SugarColumn(ColumnDescription = "管道类型")]
    public ChannelEnum ChannelType { get; set; }

    [SugarColumn(ColumnDescription = "管道地址")]
    public string ChannelUrl { get; set; }

    [SugarColumn(ColumnDescription = "管道代理地址", IsNullable = true)]
    public string? ChannelProxyUrl { get; set; }

    [SugarColumn(ColumnDescription = "所属用户id")]
    public int UserId { get; set; } = 1;
}
