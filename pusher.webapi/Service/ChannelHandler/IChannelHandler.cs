using pusher.webapi.Enums;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     管道处理信息接口
/// </summary>
public interface IChannelHandler
{
    /// <summary>
    ///     是否能处理特定类型
    /// </summary>
    /// <param name="channelType"></param>
    /// <returns></returns>
    bool CanHandle(ChannelEnum channelType);

    /// <summary>
    ///     处理实现
    /// </summary>
    /// <returns></returns>
    Task<HandlerResult> HandleText(string url, string content, string proxy);
}
