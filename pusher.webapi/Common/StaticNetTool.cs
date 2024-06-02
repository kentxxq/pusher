using System.Net;

namespace pusher.webapi.Common;

public static class StaticNetTool
{
    public static WebProxy GetWebproxyFromString(string url)
    {
        // 拿到proxy的用户名和密码
        var uri = new Uri(url);
        var username = uri.UserInfo.Split(':')[0];
        var password = uri.UserInfo.Split(':')[1];
        // 去掉url中的用户名密码
        var uriBuilder = new UriBuilder(uri)
        {
            UserName = null,
            Password = null
        };
        return new WebProxy(uriBuilder.Uri)
        {
            Credentials = new NetworkCredential(username, password)
        };
    }
}
