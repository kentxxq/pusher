using pusher.webapi.Common;
using pusher.webapi.Service.ChannelHandler.ComWechat;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class ComWechatChannelHandler : IChannelHandler
{
    /// <inheritdoc />
    public bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.ComWechat;
    }

    public async Task<HandlerResult> HandleText(string url, string content)
    {
        var data = new ComWechatText { Content = new ComWechatTextContent { Text = content } };
        var httpClient = new HttpClient();
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<ComWechatResponse>();
        return result?.ErrorCode != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
