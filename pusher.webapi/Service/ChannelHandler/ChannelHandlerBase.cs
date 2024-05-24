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

        var handler = new HttpClientHandler
        {
            Proxy = new WebProxy(proxy),
            UseProxy = true
        };
        return new HttpClient(handler);
    }
}
