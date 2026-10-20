using pusher.webapi.Enums;
using pusher.webapi.Models.DB;

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

    public override async Task<HandlerResult> HandleText(Channel channel, string content, Dictionary<string, object>? extraParams = null)
    {
        var url = channel.ChannelUrl;
        var proxy = channel.ChannelProxyUrl ?? string.Empty;
        var data = new ComWechatText { Content = new ComWechatTextContent { Text = content } };
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<ComWechatResponse>();
        return result?.ErrorCode != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
