using pusher.webapi.Common;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler;

public abstract class ChannelHandlerHttpBase : IChannelHandler
{
    private readonly IHttpClientFactory _httpClientFactory;

    protected ChannelHandlerHttpBase(IHttpClientFactory httpClientFactory)
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
            Proxy = StaticTools.GetWebproxyFromString(proxy),
            UseProxy = true
        };
        return new HttpClient(handler);
    }
}
