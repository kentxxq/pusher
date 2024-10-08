using System.Net.Mime;
using System.Text;
using System.Text.Json;
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
        var data = new QmsgText { Msg = content };
        var httpClient = GetHttpClient(proxy);


        // PostAsJsonAsync会报错
        // https://www.cnblogs.com/yexiaoyanzi/p/16309697.html
        // https://stackoverflow.com/questions/59590012/net-httpclient-accept-partial-response-when-response-header-has-an-incorrect
        // var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        using var req = new HttpRequestMessage(HttpMethod.Post, url);

        // 这里用jsonContent也会报错,原因未知...
        // req.Content = JsonContent.Create(data);
        req.Content = new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, MediaTypeNames.Application.Json);
        var httpResponseMessage = await httpClient.SendAsync(req);

        var result = await httpResponseMessage.Content.ReadFromJsonAsync<QmsgResponse>();
        return result?.Success == true
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result?.Reason ?? "" };
    }
}
