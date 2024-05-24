using System.ComponentModel.DataAnnotations;
using NetEscapades.EnumGenerators;

namespace pusher.webapi.Enums;

/// <summary>
///     有哪些角色类型
/// </summary>
[EnumExtensions]
public enum RoleType
{
    /// <summary>
    ///     免费用户
    /// </summary>
    [Display(Name = "Free", Description = "免费用户")]
    Free = 0,

    /// <summary>
    ///     会员
    /// </summary>
    [Display(Name = "VIP", Description = "VIP用户")]
    VIP = 1,

    /// <summary>
    ///     管理员
    /// </summary>
    [Display(Name = "Admin", Description = "管理员")]
    Admin = 100
}
