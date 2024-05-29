using System.Web;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.Telegram;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class TelegramChannelHandler : ChannelHandlerBase
{
    public TelegramChannelHandler(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Telegram;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        var uri = new Uri(url);
        var queryString = HttpUtility.ParseQueryString(uri.Query);
        var chatId = queryString["chatId"] ?? string.Empty;
        var realUrl = url.Split('?')[0];
        var data = new TelegramText { ChatId = chatId, Text = content };

        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(realUrl, data);
        return httpResponseMessage.IsSuccessStatusCode
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = await httpResponseMessage.Content.ReadAsStringAsync() };
    }
}
