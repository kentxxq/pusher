using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.Telegram;

public class TelegramText
{
    [JsonPropertyName("chat_id")] public string ChatId { get; set; }

    [JsonPropertyName("text")] public string Text { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("message_thread_id")]
    public string? MessageThreadId { get; set; }
}
