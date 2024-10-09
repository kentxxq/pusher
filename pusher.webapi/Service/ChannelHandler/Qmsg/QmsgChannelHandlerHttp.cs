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

        // 使用 var httpResponseMessage = await httpClient.PostAsJsonAsync(url,data) 报错
        //   System.Net.Http.HttpRequestException: An error occurred while sending the request.
        //   System.Net.Http.HttpI0Exception: The response ended prematurely. (ResponseEnded)
        // 这是因为 PostAsJsonAsync 默认使用JsonContent返回一个stream,所以不会计算长度,也就无法获得Content-Length


        // 1. 先创建HttpRequestMessage
        using var req = new HttpRequestMessage(HttpMethod.Post, url);

        // 2 设置content,这会影响到Content-Length
        // 采用 JsonContent, 即使设置req.Headers.TransferEncodingChunked = false,因为没有Content-Length, 导致TransferEncodingChunked也没有生效
        // 根据这个issues https://github.com/dotnet/runtime/issues/30283 ,可以通过LoadIntoBufferAsync把内容加载到memory中,这样JsonContent也能使用Content-Length发送
        // req.Content = JsonContent.Create(data);
        // await req.Content.LoadIntoBufferAsync();

        // 2 设置content,这会影响到Content-Length
        // 采用 StringContent. 手动序列化成string, 就会带上 Content-Length
        req.Content = new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, MediaTypeNames.Application.Json);

        // 3 发送请求,拿到结果
        var httpResponseMessage = await httpClient.SendAsync(req);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<QmsgResponse>();
        return result?.Success == true
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result?.Reason ?? "" };
    }
}
