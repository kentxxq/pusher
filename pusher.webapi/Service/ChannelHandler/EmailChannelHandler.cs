using System.Net;
using MailKit.Net.Proxy;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Models.DB;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     转发到邮箱
/// </summary>
public class EmailChannelHandler : IChannelHandler
{
    private readonly EmailService _emailService;

    public EmailChannelHandler(EmailService emailService)
    {
        _emailService = emailService;
    }

    /// <inheritdoc />
    public bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Email;
    }

    public async Task<HandlerResult> HandleText(Channel channel, string content)
    {
        bool result;
        var url = channel.ChannelUrl;
        var proxy = channel.ChannelProxyUrl ?? string.Empty;
        if (!string.IsNullOrEmpty(proxy))
        {
            var webProxy = StaticTools.GetWebproxyFromString(proxy);
            ProxyClient proxyClient;
            if (proxy.StartsWith("https"))
            {
                proxyClient = new HttpsProxyClient(webProxy.Address!.Host, webProxy.Address.Port,
                    webProxy.Credentials as NetworkCredential);
            }
            else
            {
                proxyClient = new HttpProxyClient(webProxy.Address!.Host, webProxy.Address.Port,
                    webProxy.Credentials as NetworkCredential);
            }

            result = await _emailService.SendAsync(url, "pusher", content, proxyClient);
        }
        else
        {
            result = await _emailService.SendAsync(url, "pusher", content);
        }

        return result
            ? new HandlerResult { IsSuccess = true }
            : new HandlerResult { IsSuccess = false, Message = "可能包含敏感信息,需要排查相关日志" };
    }
}
