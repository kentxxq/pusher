using pusher.webapi.Common;
using pusher.webapi.Models;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Service;

public class StringTemplateService
{
    private readonly ILogger<StringTemplate> _logger;
    private readonly Repository<StringTemplate> _repStringTemplate;
    private readonly Repository<User> _repUser;

    public StringTemplateService(Repository<StringTemplate> repStringTemplate, ILogger<StringTemplate> logger,
        Repository<User> repUser)
    {
        _repStringTemplate = repStringTemplate;
        _logger = logger;
        _repUser = repUser;
    }

    public async Task<List<StringTemplate>> GetUserStringTemplates(int userId)
    {
        var data = await _repStringTemplate.GetListAsync(t => t.UserId == userId) ?? [];
        return data;
    }

    public async Task<int> CreateStringTemplate(string templateName, StringTemplateObject stringTemplateObject)
    {
        var result = await _repStringTemplate.InsertReturnIdentityAsync(
            new StringTemplate
            {
                TemplateName = templateName,
                TemplateCode = Guid.NewGuid().ToString("D"),
                StringTemplateObject = stringTemplateObject
            });
        return result;
    }

    public async Task<bool> UpdateStringTemplate(int id, string templateName, StringTemplateObject stringTemplateObject)
    {
        var t = await _repStringTemplate.GetFirstAsync(t => t.Id == id);
        if (t is null)
        {
            return false;
        }

        t.TemplateName = templateName;
        t.StringTemplateObject = stringTemplateObject;
        return await _repStringTemplate.UpdateAsync(t);
    }

    public async Task<bool> DeleteStringTemplates(List<int> templateIdList)
    {
        return await _repStringTemplate.DeleteByIdAsync(templateIdList.Cast<object>().ToArray());
    }

    public async Task<bool> ResetSystemStringTemplates()
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == "ken");
        List<string> systemTemplateCode =
            [nameof(ChannelEnum.Lark), nameof(ChannelEnum.ComWechat), nameof(ChannelEnum.ComWechat)];
        await _repStringTemplate.DeleteAsync(t => systemTemplateCode.Contains(t.TemplateCode));
        var initStringTemplate = new List<StringTemplate>
        {
            new()
            {
                UserId = user.Id,
                TemplateName = "示例模板-飞书",
                TemplateCode = nameof(ChannelEnum.Lark),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = new List<TemplateParseObject>
                        { new() { VariableName = "text", JsonPath = "$.content.text" } },
                    TemplateText = "{{ text }}"
                }
            },
            new()
            {
                UserId = user.Id,
                TemplateName = "示例模板-钉钉",
                TemplateCode = nameof(ChannelEnum.DingTalk),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = new List<TemplateParseObject>
                        { new() { VariableName = "content", JsonPath = "$.text.content" } },
                    TemplateText = "{{ content }}"
                }
            },
            new()
            {
                UserId = user.Id,
                TemplateName = "示例模板-企业微信",
                TemplateCode = nameof(ChannelEnum.ComWechat),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = new List<TemplateParseObject>
                        { new() { VariableName = "content", JsonPath = "$.text.content" } },
                    TemplateText = "{{ content }}"
                }
            }
        };

        return await _repStringTemplate.InsertRangeAsync(initStringTemplate);
    }
}
