using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.Lark;

/// <summary>
///     飞书的文本结构
/// </summary>
public class LarkText
{
    [JsonPropertyName("msg_type")] public string MessageType { get; set; } = "text";

    [JsonPropertyName("content")] public LarkTextContent Content { get; set; }
}

public class LarkTextContent
{
    [JsonPropertyName("text")] public string Text { get; set; }
}

/// <summary>
///     飞书的文本响应
/// </summary>
public class LarkTextResponse
{
    [JsonPropertyName("StatusCode")] public int StatusCode { get; set; }

    [JsonPropertyName("StatusMessage")] public string StatusMessage { get; set; }

    [JsonPropertyName("code")] public int Code { get; set; }

    [JsonPropertyName("data")] public object Data { get; set; }

    [JsonPropertyName("msg")] public string Msg { get; set; }
}
