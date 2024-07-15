using System.Net;
using System.Net.Sockets;
using SqlSugar;

namespace pusher.webapi.Common;

public static class StaticTools
{
    public static PageModel CreatePageModel(int pageIndex, int PageSize)
    {
        return new PageModel { PageIndex = pageIndex, PageSize = PageSize };
    }

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

    /// <summary>
    ///     获取本机ipv4内网ip<br />
    ///     如果网络不可用返回127.0.0.1<br />
    ///     如果之前网络可用，可能会返回之前保留下来的ip地址
    /// </summary>
    /// <returns></returns>
    public static IPAddress GetLocalIP()
    {
        try
        {
            using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
            socket.Connect("223.5.5.5", 53);
            var endPoint = socket.LocalEndPoint as IPEndPoint;
            endPoint ??= new IPEndPoint(IPAddress.Loopback, 0);
            return endPoint.Address;
        }
        catch (Exception)
        {
            return IPAddress.Loopback;
        }
    }
}
