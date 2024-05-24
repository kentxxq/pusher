using pusher.webapi.Common;
using pusher.webapi.Enums;

namespace pusher.webapi.Service.MessageHandler;

/// <summary>
///     消息处理接口
/// </summary>
public interface IMessageHandler
{
    /// <summary>
    ///     是否能处理特定类型
    /// </summary>
    /// <param name="msgType"></param>
    /// <returns></returns>
    bool CanHandle(MessageEnum msgType);

    /// <summary>
    ///     处理实现
    /// </summary>
    /// <param name="roomCode"></param>
    /// <param name="messageInfo"></param>
    /// <returns></returns>
    Task<bool> Handle(string roomCode, MessageInfo messageInfo);
}
