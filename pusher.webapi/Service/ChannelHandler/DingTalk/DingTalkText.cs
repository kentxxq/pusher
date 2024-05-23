using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.DingTalk;

/// <summary>
///     钉钉的文本结构
/// </summary>
public class DingTalkText
{
    [JsonPropertyName("msgtype")] public string MessageType { get; set; } = "text";

    [JsonPropertyName("text")] public DingTalkTextContent Content { get; set; }
}

public class DingTalkTextContent
{
    [JsonPropertyName("content")] public string Text { get; set; }
}

/// <summary>
///     钉钉的文本响应
/// </summary>
public class DingTalkResponse
{
    [JsonPropertyName("errcode")] public int ErrorCode { get; set; }

    [JsonPropertyName("errmsg")] public string ErrorMessage { get; set; }
}
