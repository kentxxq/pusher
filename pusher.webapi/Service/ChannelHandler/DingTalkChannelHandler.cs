using pusher.webapi.Enums;
using pusher.webapi.Service.ChannelHandler.DingTalk;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class DinkTalkChannelHandler : ChannelHandlerBase
{
    public DinkTalkChannelHandler(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.DingTalk;
    }

    public override async Task<HandlerResult> HandleText(string url, string content,string proxy)
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
