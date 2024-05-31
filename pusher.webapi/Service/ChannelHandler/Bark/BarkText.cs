using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.ComWechat;

public class BarkText
{
    [JsonPropertyName("title")] public string Title { get; set; } = "pusher";
    [JsonPropertyName("body")] public string Body { get; set; }
    [JsonPropertyName("group")] public string Group { get; set; } = "pusher";
}
