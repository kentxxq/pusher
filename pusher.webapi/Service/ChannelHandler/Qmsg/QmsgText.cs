using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace pusher.webapi.Service.ChannelHandler.Qmsg;

public class QmsgText
{
    [JsonPropertyName("msg")] public string Msg { get; set; }
}

/// <summary>
///     Qmsg的文本响应
/// </summary>
public class QmsgResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }

    [JsonPropertyName("reason")] public string Reason { get; set; }

    [JsonPropertyName("code")] public int Code { get; set; }

    [JsonPropertyName("info")] public JsonObject Info { get; set; }
}
