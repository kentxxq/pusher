using System.Net.Mime;
using System.Text;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     webhook, 将内容原封不动转发到第三方
/// </summary>
public class WebhookChannelHandler : ChannelHandlerHttpBase
{
    private readonly EmailService _emailService;

    public WebhookChannelHandler(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Webhook;
    }

    public override async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        // var data = JsonContent.Create(content);
        var data = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json);
        var httpClient = GetHttpClient(proxy);
        var httpResponseMessage = await httpClient.PostAsync(url, data);
        var result = await httpResponseMessage.Content.ReadAsStringAsync();
        return httpResponseMessage.IsSuccessStatusCode
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result };
    }
}
