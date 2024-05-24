using pusher.webapi.Enums;
using pusher.webapi.Service.ChannelHandler.DingTalk;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class DinkTalkChannelHandler : IChannelHandler
{
    private readonly IHttpClientFactory _httpClientFactory;

    public DinkTalkChannelHandler(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    /// <inheritdoc />
    public bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.DingTalk;
    }

    public async Task<HandlerResult> HandleText(string url, string content)
    {
        var data = new DingTalkText { Content = new DingTalkTextContent { Text = content } };
        var httpClient = _httpClientFactory.CreateClient(nameof(HttpClientType.Default));
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<DingTalkResponse>();
        return result?.ErrorCode != 0
            ? new HandlerResult { IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty }
            : new HandlerResult { IsSuccess = true };
    }
}
