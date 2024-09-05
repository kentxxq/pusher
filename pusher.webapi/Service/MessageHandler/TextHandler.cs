using System.Text.Json.Nodes;
using HandlebarsDotNet;
using Json.Path;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.ChannelHandler;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service.MessageHandler;

/// <summary>
///     处理纯文本
/// </summary>
public class TextHandler : IMessageHandler
{
    private readonly IEnumerable<IChannelHandler> _channelHandlers;
    private readonly ILogger<TextHandler> _logger;
    private readonly Repository<Channel> _repChannel;
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;
    private readonly Repository<RoomWithChannel> _repRoomWithChannel;
    private readonly Repository<StringTemplate> _repStringTemplate;

    /// <summary>
    ///     依赖注入
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="dbChannelService"></param>
    /// <param name="channelHandlers"></param>
    public TextHandler(ILogger<TextHandler> logger, IEnumerable<IChannelHandler> channelHandlers,
        Repository<Room> repRoom, Repository<StringTemplate> repStringTemplate, Repository<Message> repMessage,
        Repository<RoomWithChannel> repRoomWithChannel, Repository<ChannelMessageHistory> repChannelMessageHistory,
        Repository<Channel> repChannel)
    {
        _logger = logger;
        _channelHandlers = channelHandlers;
        _repRoom = repRoom;
        _repStringTemplate = repStringTemplate;
        _repMessage = repMessage;
        _repRoomWithChannel = repRoomWithChannel;
        _repChannelMessageHistory = repChannelMessageHistory;
        _repChannel = repChannel;
    }


    /// <inheritdoc />
    public bool CanHandle(MessageEnum msgType)
    {
        return msgType == MessageEnum.Text;
    }

    /// <inheritdoc />
    public async Task<bool> Handle(string roomCode, MessageInfo messageInfo)
    {
        var room = await _repRoom.GetFirstAsync(r => r.RoomCode == roomCode);
        if (room is null)
        {
            return false;
        }

        // 判断是否需要使用模板
        string textContent;
        if (string.IsNullOrEmpty(messageInfo.TemplateCode))
        {
            textContent = messageInfo.Content.ToString() ?? string.Empty;
        }
        else
        {
            textContent = await RenderStringTemplate(messageInfo);
        }

        // 记录到消息表
        var message = new Message
        {
            MessageType = MessageEnum.Text,
            Content = textContent,
            Comment = string.Empty,
            RoomId = room.Id
        };
        var messageId = await _repMessage.InsertReturnIdentityAsync(message);
        _logger.LogInformation($"消息历史表message新增记录，id为{messageId}");

        // 查询房间关联的channel
        var roomChannelIDs = await _repRoomWithChannel.GetListAsync(r => r.RoomId == room.Id) ?? [];

        // 添加记录到channelMessageHistory中,保存任务状态
        var channelMessageHistory = roomChannelIDs.Select(r => new ChannelMessageHistory
                { ChannelId = r.ChannelId, MessageId = messageId, Status = ChannelMessageStatus.Todo })
            .ToList();
        await _repChannelMessageHistory.InsertRangeAsync(channelMessageHistory);
        _logger.LogInformation($"管道消息历史表ChannelMessageHistory新增{channelMessageHistory.Count}条记录");

        // 开始处理信息
        channelMessageHistory = await _repChannelMessageHistory.GetListAsync(h => h.MessageId == messageId);
        foreach (var h in channelMessageHistory)
        {
            var channel = await _repChannel.GetByIdAsync(h.ChannelId);
            var handler = _channelHandlers.FirstOrDefault(c => c.CanHandle(channel.ChannelType));
            if (handler is null)
            {
                _logger.LogWarning($"管道消息历史表{h.Id}没有合适的管道处理");
                continue;
            }

            try
            {
                var result = await handler.HandleText(channel.ChannelUrl, textContent, channel.ChannelProxyUrl);
                h.Success = result.IsSuccess;
                if (!result.IsSuccess)
                {
                    h.Result = result.Message;
                    _logger.LogWarning($"管道地址{channel.ChannelUrl}发送失败,{result.Message}");
                }
                else
                {
                    _logger.LogInformation($"管道地址{channel.ChannelUrl}发送成功");
                }
            }
            catch (Exception e)
            {
                _logger.LogWarning($"管道地址{channel.ChannelUrl}报错,{e.Message}");
            }
            finally
            {
                h.Status = ChannelMessageStatus.Done;
                await _repChannelMessageHistory.UpdateAsync(h);
            }
        }

        return true;
    }

    /// <summary>
    ///     使用模板渲染字符串
    /// </summary>
    /// <param name="messageInfo"></param>
    /// <returns></returns>
    private async Task<string> RenderStringTemplate(MessageInfo messageInfo)
    {
        _logger.LogInformation($"{nameof(RenderStringTemplate)}-原始文本:{messageInfo.Content}");

        // 拿到字符串模板
        var stringTemplate = await _repStringTemplate.GetFirstAsync(t => t.TemplateCode == messageInfo.TemplateCode);
        if (stringTemplate is null)
        {
            _logger.LogWarning("没有找到字符串模板:{MessageInfoTemplateCode}", messageInfo.TemplateCode);
            return string.Empty;
        }

        // 准备渲染器
        var handlebars = Handlebars.Create();
        handlebars.Configuration.TextEncoder = new HtmlEncoder();
        var template = handlebars.Compile(stringTemplate.StringTemplateObject.TemplateText);

        // 存放解析后的值
        var dataDictionary = new Dictionary<string, object>();
        // 开始取值
        var instance = JsonNode.Parse(messageInfo.Content.ToString() ?? string.Empty);
        foreach (var variable in stringTemplate.StringTemplateObject.Variables)
        {
            var path = JsonPath.Parse(variable.JsonPath);
            string value;
            // 如果解析失败,纪录日志. 并且返回空字符串
            try
            {
                value = path.Evaluate(instance).Matches?.First().Value?.ToString() ?? string.Empty;
            }
            catch (Exception e)
            {
                _logger.LogWarning(
                    $"{nameof(RenderStringTemplate)}-变量{variable.VariableName}取值{variable.JsonPath}失败:{e.Message}");
                value = string.Empty;
            }

            dataDictionary.Add(variable.VariableName, value);
        }

        // 渲染文本
        var text = template(dataDictionary);
        _logger.LogInformation($"{nameof(RenderStringTemplate)}-渲染后:{text}");
        return text;
    }
}
