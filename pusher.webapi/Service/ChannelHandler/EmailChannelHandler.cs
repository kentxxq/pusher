using System.Net;
using MailKit.Net.Proxy;
using pusher.webapi.Common;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler.Bark;

/// <summary>
///     钉钉处理信息的方法
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

    public async Task<HandlerResult> HandleText(string url, string content, string proxy)
    {
        bool result;
        if (!string.IsNullOrEmpty(proxy))
        {
            var webProxy = StaticNetTool.GetWebproxyFromString(proxy);
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
