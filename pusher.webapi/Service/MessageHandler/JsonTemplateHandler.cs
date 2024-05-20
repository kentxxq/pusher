using pusher.webapi.Common;

namespace pusher.webapi.Service.MessageHandler;

/// <summary>
///     处理json模板
/// </summary>
public class JsonTemplateHandler : IMessageHandler
{
    public bool CanHandle(MessageEnum msgType)
    {
        return MessageEnum.JsonTemplate == msgType;
    }

    public Task<bool> Handle(string roomCode, MessageInfo messageInfo)
    {
        throw new NotImplementedException();
    }
}
