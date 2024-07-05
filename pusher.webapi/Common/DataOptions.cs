namespace pusher.webapi.Common;

public class DataOptions
{
    public const string Data = "Data";

    /// <summary>
    ///     默认清理超过30天的消息记录
    /// </summary>
    public int MessageRetentionPeriod { get; set; } = 30;
}
