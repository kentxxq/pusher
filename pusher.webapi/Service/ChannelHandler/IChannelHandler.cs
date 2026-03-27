using pusher.webapi.Enums;
using pusher.webapi.Models.DB;

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
    Task<HandlerResult> HandleText(Channel channel, string content, Dictionary<string, object>? extraParams = null);
}
