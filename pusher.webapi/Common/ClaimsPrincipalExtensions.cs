using System.Security.Claims;
using IdentityModel;

namespace pusher.webapi.Common;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(JwtClaimTypes.Id);
        return int.Parse(id!);
    }

    public static string GetUsername(this ClaimsPrincipal user)
    {
        var username = user.Identity!.Name!;
        return username;
    }
}
