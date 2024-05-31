using pusher.webapi.Enums;
using pusher.webapi.Service.ChannelHandler.ComWechat;

namespace pusher.webapi.Service.ChannelHandler.Bark;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class BarkChannelHandler : ChannelHandlerBase
{
    public BarkChannelHandler(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Bark;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var data = new BarkText { Body = content };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadAsStringAsync();
        Console.WriteLine(result);
        return httpResponseMessage.IsSuccessStatusCode
            ? new HandlerResult { IsSuccess = false, Message = result }
            : new HandlerResult { IsSuccess = true };
    }
}
