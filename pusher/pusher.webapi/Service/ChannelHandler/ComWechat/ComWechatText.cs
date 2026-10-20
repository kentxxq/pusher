using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.ComWechat;

/// <summary>
///     企业微信的文本结构
/// </summary>
public class ComWechatText
{
    [JsonPropertyName("msgtype")] public string MessageType { get; set; } = "text";

    [JsonPropertyName("text")] public ComWechatTextContent Content { get; set; }
}

public class ComWechatTextContent
{
    [JsonPropertyName("content")] public string Text { get; set; }
}

/// <summary>
///     企业微信的文本响应
/// </summary>
public class ComWechatResponse
{
    [JsonPropertyName("errcode")] public int ErrorCode { get; set; }

    [JsonPropertyName("errmsg")] public string ErrorMessage { get; set; }
}
