using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.Qmsg;

/// <summary>
///     bark https://apps.apple.com/us/app/bark-customed-notifications/id1403753865
/// </summary>
public class QmsgChannelHandlerHttp : ChannelHandlerHttpBase
{
    public QmsgChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Qmsg;
    }

    /// <inheritdoc />
    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var data = new QmsgText() { Msg = content };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<QmsgResponse>();
        return result?.Success == true
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result?.Reason ?? "" };
    }
}
