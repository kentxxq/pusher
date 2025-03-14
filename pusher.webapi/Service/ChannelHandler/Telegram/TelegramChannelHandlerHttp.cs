using System.Web;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.Telegram;

/// <summary>
///     电报telegram
/// https://core.telegram.org/bots/api#sendmessage
/// </summary>
public class TelegramChannelHandlerHttp : ChannelHandlerHttpBase
{
    public TelegramChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Telegram;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        // url中会传递chatId,这里提取出来
        var uri = new Uri(url);
        var queryString = HttpUtility.ParseQueryString(uri.Query);
        var chatId = queryString["chatId"] ?? string.Empty;
        var messageThreadId = queryString["message_thread_id"];
        // 因为url带了参数,所以截断一下
        var realUrl = url.Split('?')[0];
        var data = new TelegramText { ChatId = chatId, Text = content, MessageThreadId = messageThreadId };

        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsJsonAsync(realUrl, data);
        return httpResponseMessage.IsSuccessStatusCode
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = await httpResponseMessage.Content.ReadAsStringAsync() };
    }
}
