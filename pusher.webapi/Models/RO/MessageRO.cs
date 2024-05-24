using pusher.webapi.Enums;

namespace pusher.webapi.Models.RO;

public class MessageRO
{
    public MessageEnum MessageType { get; set; }

    public object Content { get; set; }
}

public class TextContent
{
    public string Content { get; set; }
}

public class ImageContent
{
    public string ImageName { get; set; }

    public string ImageUrl { get; set; }
}
