using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.ComWechat;

/// <summary>
///     企业微信
/// </summary>
public class ComWechatChannelHandlerHttp : ChannelHandlerHttpBase
{
    public ComWechatChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.ComWechat;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var data = new ComWechatText { Content = new ComWechatTextContent { Text = content } };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<ComWechatResponse>();
        return result?.ErrorCode != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
