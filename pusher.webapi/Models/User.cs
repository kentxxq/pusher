using pusher.webapi.Common;
using SqlSugar;

namespace pusher.webapi.Models;

[SugarTable(nameof(User), "用户表")]
public class User
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "用户名")]
    public string Username { get; set; } = null!;

    [SugarColumn(ColumnDescription = "密码")]
    public string Password { get; set; } = null!;

    [SugarColumn(ColumnDescription = "用户角色")]
    public RoleType RoleType { get; set; } = RoleType.Free;

    [SugarColumn(IsNullable = true, ColumnDescription = "上一次发送密码邮件的时间")]
    public DateTime? LastForgetTime { get; set; }

    [SugarColumn(IsNullable = true, ColumnDescription = "最近一次登录时间")]
    public DateTime? LastLoginTime { get; set; }
}
