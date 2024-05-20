using pusher.webapi.Common;
using pusher.webapi.Models;
using pusher.webapi.Service.ChannelHandler.Lark;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class LarkChannelHandler : IChannelHandler
{
    private readonly ILogger<LarkChannelHandler> _logger;
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;


    public LarkChannelHandler(ILogger<LarkChannelHandler> logger, Repository<Message> repMessage,
        Repository<ChannelMessageHistory> repChannelMessageHistory)
    {
        _logger = logger;
        _repMessage = repMessage;
        _repChannelMessageHistory = repChannelMessageHistory;
    }

    /// <inheritdoc />
    public bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.Lark;
    }

    /// <inheritdoc />
    public async Task<bool> Handle(string url, ChannelMessageHistory channelMessageHistory)
    {
        var message = await _repMessage.GetByIdAsync(channelMessageHistory.MessageId);
        if (message.MessageType == MessageEnum.Text)
        {
            var data = new LarkText { Content = new LarkTextContent { Text = message.Content } };
            var httpClient = new HttpClient();
            var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
            var result = await httpResponseMessage.Content.ReadFromJsonAsync<LarkTextResponse>();
            channelMessageHistory.Status = ChannelMessageStatus.Done;
            channelMessageHistory.Result = result?.Msg ?? string.Empty;
            if (result?.Code != 0)
            {
                _logger.LogWarning($"请求{message.Id}在{nameof(LarkChannelHandler)}发送失败");
            }
            else
            {
                _logger.LogInformation($"请求{message.Id}在{nameof(LarkChannelHandler)}发送成功");
                channelMessageHistory.Success = true;
            }

            await _repChannelMessageHistory.UpdateAsync(channelMessageHistory);
        }

        return true;
    }
}
