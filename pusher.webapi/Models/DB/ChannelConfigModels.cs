using System.Text.Json.Serialization;

namespace pusher.webapi.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BarkEncryptionMode
{
    None,
    AES128CBC,
    AES128ECB,
    AES256CBC,
    AES256ECB
}

public class BarkChannelConfig
{
    [JsonPropertyName("encryptionKey")]
    public string? EncryptionKey { get; set; }

    [JsonPropertyName("encryptionIv")]
    public string? EncryptionIv { get; set; }

    [JsonPropertyName("encryptionMode")]
    public BarkEncryptionMode EncryptionMode { get; set; } = BarkEncryptionMode.None;
}

public class TelegramChannelConfig { }
public class DingTalkChannelConfig { }
public class LarkChannelConfig { }
public class WebhookChannelConfig { }
public class EmailChannelConfig { }
public class ComWechatChannelConfig { }
public class QmsgChannelConfig { }
