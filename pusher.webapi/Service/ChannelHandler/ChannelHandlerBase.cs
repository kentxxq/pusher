using System.Net;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler;

public abstract class ChannelHandlerBase : IChannelHandler
{
    private readonly IHttpClientFactory _httpClientFactory;

    protected ChannelHandlerBase(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public abstract bool CanHandle(ChannelEnum channelType);

    public abstract Task<HandlerResult> HandleText(string url, string content, string proxy);

    /// <summary>
    ///     获取httpclient
    ///     没有使用代理,就采用IHttpClientFactory , 都则只能每次都初始化
    /// </summary>
    /// <param name="proxy"></param>
    /// <returns></returns>
    protected HttpClient GetHttpClient(string proxy)
    {
        if (string.IsNullOrEmpty(proxy))
        {
            return _httpClientFactory.CreateClient(nameof(HttpClientType.Default));
        }

        // 拿到proxy的用户名和密码
        var uri = new Uri(proxy);
        var username = uri.UserInfo.Split(':')[0];
        var password = uri.UserInfo.Split(':')[1];
        // 去掉url中的用户名密码
        var uriBuilder = new UriBuilder(uri)
        {
            UserName = null,
            Password = null
        };
        var handler = new HttpClientHandler
        {
            Proxy = new WebProxy(uriBuilder.Uri)
            {
                Credentials = new NetworkCredential(username, password)
            },
            UseProxy = true
        };
        return new HttpClient(handler);
    }
}
