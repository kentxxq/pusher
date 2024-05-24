using pusher.webapi.Enums;

namespace pusher.webapi.Models.RO;

public class UpdateUserRoleRO
{
    public string Username { get; set; } = null!;

    public RoleType RoleType { get; set; } = RoleType.Free;
}
