namespace pusher.webapi.Options;

public class DataOptions
{
    /// <summary>
    ///     默认清理超过30天的消息记录
    /// </summary>
    public int MessageRetentionPeriod { get; set; } = 30;
}
