using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Extensions;
using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using pusher.webapi.Service;

namespace pusher.webapi.Controllers;

/// <summary>
///     消息入口
/// </summary>
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class StringTemplateController : ControllerBase
{
    private readonly StringTemplateService _stringTemplateService;

    /// <inheritdoc />
    public StringTemplateController(StringTemplateService stringTemplateService)
    {
        _stringTemplateService = stringTemplateService;
    }

    [HttpGet]
    public async Task<ResultModel<List<StringTemplate>>> GetUserStringTemplates()
    {
        var data = await _stringTemplateService.GetUserStringTemplates(HttpContext.User.GetUserId());
        return ResultModel.Ok(data);
    }

    [HttpPost]
    public async Task<ResultModel<int>> CreateStringTemplate(CreateStringTemplateRO createStringTemplateRO)
    {
        if (await _stringTemplateService.GetStringTemplateByStringTemplateCode(createStringTemplateRO.TemplateCode) is not null)
        {
            throw new PusherException($"创建{createStringTemplateRO.TemplateName}失败,{createStringTemplateRO.TemplateCode}已经存在了");
        }

        var id = await _stringTemplateService.CreateStringTemplate(HttpContext.User.GetUserId(),createStringTemplateRO.TemplateName,createStringTemplateRO.TemplateCode,
            createStringTemplateRO.StringTemplateObject);
        return ResultModel.Ok(id);
    }

    [HttpPost]
    public async Task<ResultModel<bool>> UpdateStringTemplate(UpdateStringTemplateRO updateStringTemplateRO)
    {
        var tmpStringTemplate =
            await _stringTemplateService.GetStringTemplateByStringTemplateCode(updateStringTemplateRO.TemplateCode);
        if (tmpStringTemplate is not null && tmpStringTemplate.Id != updateStringTemplateRO.Id)
        {
            throw new PusherException($"更新{updateStringTemplateRO.TemplateName}失败,{updateStringTemplateRO.TemplateCode}已经存在了");
        }

        var result = await _stringTemplateService.UpdateStringTemplate(updateStringTemplateRO.Id,
            updateStringTemplateRO.TemplateName,updateStringTemplateRO.TemplateCode, updateStringTemplateRO.StringTemplateObject);
        return ResultModel.Ok(result);
    }

    [HttpPost]
    public async Task<ResultModel<bool>> DeleteStringTemplates(List<int> roomIdList)
    {
        var result = await _stringTemplateService.DeleteStringTemplates(roomIdList);
        return ResultModel.Ok(result);
    }
}
