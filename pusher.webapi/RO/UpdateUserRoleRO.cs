using pusher.webapi.Common;

namespace pusher.webapi.RO;

public class UpdateUserRoleRO
{
    public string Username { get; set; } = null!;

    public RoleType RoleType { get; set; } = RoleType.Free;
}
