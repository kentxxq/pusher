using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.Lark;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class LarkChannelHandlerHttp : ChannelHandlerHttpBase
{
    public LarkChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Lark;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var data = new LarkText { Content = new LarkTextContent { Text = content } };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<LarkTextResponse>();
        return result?.Code != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.Msg ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
