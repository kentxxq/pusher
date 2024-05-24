namespace pusher.webapi.Extensions;

public static class UtilExtension
{
    public static string GetUsername(this HttpContext context)
    {
        return context.User.Identity?.Name ?? throw new Exception("无法获取username");
    }
}
