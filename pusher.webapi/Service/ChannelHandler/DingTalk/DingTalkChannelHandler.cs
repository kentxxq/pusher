using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.DingTalk;

/// <summary>
///     钉钉
/// </summary>
public class DinkTalkChannelHandlerHttp : ChannelHandlerHttpBase
{
    public DinkTalkChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.DingTalk;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var data = new DingTalkText { Content = new DingTalkTextContent { Text = content } };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<DingTalkResponse>();
        return result?.ErrorCode != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
