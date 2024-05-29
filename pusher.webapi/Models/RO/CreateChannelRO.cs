using pusher.webapi.Enums;

namespace pusher.webapi.Models.RO;

public class CreateChannelRO
{
    public string ChannelName { get; set; }
    public ChannelEnum ChannelType { get; set; }
    public string ChannelUrl { get; set; }
    public string ChannelProxyUrl { get; set; }
}
