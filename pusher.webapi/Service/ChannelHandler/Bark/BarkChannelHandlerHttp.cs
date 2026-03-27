using pusher.webapi.Enums;
using pusher.webapi.Models;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.ChannelHandler.ComWechat;

namespace pusher.webapi.Service.ChannelHandler.Bark;

/// <summary>
///     bark https://apps.apple.com/us/app/bark-customed-notifications/id1403753865
/// </summary>
public class BarkChannelHandlerHttp : ChannelHandlerHttpBase
{
    public BarkChannelHandlerHttp(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
    {
    }

    /// <inheritdoc />
    public override bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Bark;
    }

    public override async Task<HandlerResult> HandleText(Channel channel, string content, Dictionary<string, object>? extraParams = null)
    {
        var url = channel.ChannelUrl;
        var proxy = channel.ChannelProxyUrl ?? string.Empty;
        var httpClient = GetHttpClient(proxy);

        BarkChannelConfig? config = null;
        if (!string.IsNullOrEmpty(channel.ChannelConfig))
        {
            config = System.Text.Json.JsonSerializer.Deserialize<BarkChannelConfig>(channel.ChannelConfig);
        }

        // 默认载荷
        var dataPayload = new Dictionary<string, object>
        {
            { "body", content },
            { "title", "pusher" },
            { "group", "pusher" }
        };

        // 合并透传参数 (透传参数会覆盖默认值)
        if (extraParams != null)
        {
            foreach (var kv in extraParams)
            {
                dataPayload[kv.Key] = kv.Value;
            }
        }

        HttpResponseMessage httpResponseMessage;
        if (config is not null && config.EncryptionMode != BarkEncryptionMode.None)
        {
            var jsonPayload = System.Text.Json.JsonSerializer.Serialize(dataPayload);
            var encrypted = BarkEncryptionHelper.Encrypt(jsonPayload, config);
            var data = new { ciphertext = encrypted };
            httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        }
        else
        {
            httpResponseMessage = await httpClient.PostAsJsonAsync(url, dataPayload);
        }

        var result = await httpResponseMessage.Content.ReadAsStringAsync();
        return httpResponseMessage.IsSuccessStatusCode
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = result };
    }
}
