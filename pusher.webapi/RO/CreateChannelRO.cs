using pusher.webapi.Common;

namespace pusher.webapi.RO;

public class CreateChannelRO
{
    public string ChannelName { get; set; }
    public ChannelEnum ChannelType { get; set; }
    public string ChannelUrl { get; set; }
}
