using pusher.webapi.Common;
using pusher.webapi.Models;
using pusher.webapi.Service.ChannelHandler.DingTalk;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service.ChannelHandler;

/// <summary>
///     钉钉处理信息的方法
/// </summary>
public class DinkTalkChannelHandler : IChannelHandler
{
    /// <inheritdoc />
    public bool CanHandle(ChannelEnum channelType)
    {
        return channelType == ChannelEnum.DingTalk;
    }

    public async Task<HandlerResult> HandleText(string url, string content)
    {
        var data = new DingTalkText { Content = new DingTalkTextContent { Text = content } };
        var httpClient = new HttpClient();
        var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
        var result = await httpResponseMessage.Content.ReadFromJsonAsync<DingTalkResponse>();
        return result?.ErrorCode != 0 ? new HandlerResult{IsSuccess = false, Message = result?.ErrorMessage ?? string.Empty} : new HandlerResult{IsSuccess = true};
    }

    /// <inheritdoc />
    // public async Task<bool> HandleText(string url, ChannelMessageHistory channelMessageHistory)
    // {
    //     var message = await _repMessage.GetByIdAsync(channelMessageHistory.MessageId);
    //     if (message.MessageType == MessageEnum.Text)
    //     {
    //         var data = new DingTalkText { Content = new DingTalkTextContent { Text = message.Content } };
    //         var httpClient = new HttpClient();
    //         var httpResponseMessage = await httpClient.PostAsJsonAsync(url, data);
    //         var result = await httpResponseMessage.Content.ReadFromJsonAsync<DingTalkResponse>();
    //         channelMessageHistory.Status = ChannelMessageStatus.Done;
    //         channelMessageHistory.Result = result?.ErrorMessage ?? string.Empty;
    //         if (result?.ErrorCode != 0)
    //         {
    //             _logger.LogWarning($"请求{message.Id}在{nameof(DinkTalkChannelHandler)}发送失败");
    //         }
    //         else
    //         {
    //             _logger.LogInformation($"请求{message.Id}在{nameof(DinkTalkChannelHandler)}发送成功");
    //             channelMessageHistory.Success = true;
    //         }
    //
    //         await _repChannelMessageHistory.UpdateAsync(channelMessageHistory);
    //     }
    //
    //     return true;
    // }
}
