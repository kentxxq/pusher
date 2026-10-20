using pusher.webapi.Common;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.Database;
using SqlSugar;

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

    public async Task<PageDataModel<StringTemplate>> GetUserStringTemplatesWithPage(int userId, int pageIndex,
        int pageSize)
    {
        var p = StaticTools.CreatePageModel(pageIndex, pageSize);
        var data = await _repStringTemplate.GetPageListAsync(t => t.UserId == userId, p, t => t.Id, OrderByType.Asc) ??
                   [];
        return PageDataModel.Ok(data, p);
    }

    public async Task<List<StringTemplate>> GetUserStringTemplates(int userId)
    {
        var data = await _repStringTemplate.GetListAsync(t => t.UserId == userId) ?? [];
        return data;
    }

    /// <summary>
    ///     通过stringTemplateCode获取模板
    /// </summary>
    /// <returns></returns>
    public async Task<StringTemplate?> GetStringTemplateByStringTemplateCode(string stringTemplateCode)
    {
        var stringTemplate = await _repStringTemplate.GetFirstAsync(r => r.TemplateCode == stringTemplateCode);
        return stringTemplate;
    }

    public async Task<int> CreateStringTemplate(int userId, string templateName, string templateCode,
        StringTemplateObject stringTemplateObject)
    {
        var result = await _repStringTemplate.InsertReturnIdentityAsync(
            new StringTemplate
            {
                TemplateName = templateName,
                TemplateCode = templateCode,
                StringTemplateObject = stringTemplateObject,
                UserId = userId
            });
        return result;
    }

    public async Task<bool> UpdateStringTemplate(int id, string templateName, string templateCode,
        StringTemplateObject stringTemplateObject)
    {
        var t = await _repStringTemplate.GetFirstAsync(t => t.Id == id);
        if (t is null)
        {
            return false;
        }

        t.TemplateName = templateName;
        t.TemplateCode = templateCode;
        t.StringTemplateObject = stringTemplateObject;
        return await _repStringTemplate.UpdateAsync(t);
    }

    public async Task<bool> DeleteStringTemplates(List<int> templateIdList)
    {
        return await _repStringTemplate.DeleteByIdAsync(templateIdList.Cast<object>().ToArray());
    }

    /// <summary>
    ///     判断模板是否属于特定user
    /// </summary>
    /// <param name="roomId"></param>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<bool> IsStringTemplateBelongsToUser(int roomId, int userId)
    {
        var stringTemplates = await GetUserStringTemplates(userId);
        return stringTemplates.Select(t => t.Id).Contains(roomId);
    }
}
