namespace pusher.webapi.Common;

public class MessageInfo
{
    public MessageEnum MessageType { get; set; } = MessageEnum.Text;
    public object Content { get; set; } = null!;
    public string TemplateCode { get; set; } = string.Empty;
}
