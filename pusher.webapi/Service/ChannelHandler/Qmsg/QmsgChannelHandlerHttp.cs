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

        // 背景: Qmsg启用了http2连接, 而http2不支持chunked编码("Transfer-Encoding": "chunked"), 所以需要设置Content-Length.
        // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Transfer-Encoding

        // 使用 using var req = new HttpRequestMessage(HttpMethod.Post, url); 报错
        //   System.Net.Http.HttpRequestException: An error occurred while sending the request.
        //   System.Net.Http.HttpI0Exception: The response ended prematurely. (ResponseEnded)
        // 这是因为PostAsJsonAsync使用了jsonContent.Create 这是一个stream,所以不会计算长度,也就无法获得Content-Length
        // 即使设置req.Headers.TransferEncodingChunked = false,因为没有Content-Length, 导致TransferEncodingChunked也没有生效

        // 这里提前序列化成string, 采用StringContent就会带上 Content-Length, 请求正常
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, MediaTypeNames.Application.Json);
        var httpResponseMessage = await httpClient.SendAsync(req);

        req.Content = JsonContent.Create(data);
        req.Headers.TransferEncodingChunked = false;

        var result = await httpResponseMessage.Content.ReadFromJsonAsync<QmsgResponse>();
        return result?.Success == true
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result?.Reason ?? "" };
    }
}
