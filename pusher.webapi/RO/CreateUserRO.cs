using pusher.webapi.Common;

namespace pusher.webapi.RO;

public class CreateUserRO
{
    public string Username { get; set; } = null!;

    public string Password { get; set; } = null!;

    public RoleType RoleType { get; set; } = RoleType.Free;
}
