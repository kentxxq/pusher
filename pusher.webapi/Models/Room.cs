using SqlSugar;

namespace pusher.webapi.Models;

[SugarTable(nameof(Room), "房间表")]
public class Room
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "房间名")]
    public string RoomName { get; set; } = null!;

    [SugarColumn(ColumnDescription = "房间代码,访问地址")]
    public string RoomCode { get; set; }

    [SugarColumn(IsNullable = true, ColumnDescription = "房间密钥")]
    public string? RoomKey { get; set; } = null!;

    [SugarColumn(IsNullable = true, ColumnDescription = "房间别名")]
    public string? CustomRoomName { get; set; } = null!;

    [SugarColumn(ColumnDescription = "所属用户id")]
    public int UserId { get; set; } = 1;

    [SugarColumn(ColumnDescription = "房间的创建时间")]
    public DateTime? CreateDate { get; set; }
}
