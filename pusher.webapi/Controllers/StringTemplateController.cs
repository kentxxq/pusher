using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Models;
using pusher.webapi.RO;
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
    public async Task<ResultModel<int>> CreateStringTemplate(CreateStringTemplateRO createStringTemplateRo)
    {
        var id = await _stringTemplateService.CreateStringTemplate(createStringTemplateRo.TemplateName,
            createStringTemplateRo.StringTemplateObject);
        return ResultModel.Ok(id);
    }

    [HttpPost]
    public async Task<ResultModel<bool>> UpdateStringTemplate(UpdateStringTemplateRO updateStringTemplateRO)
    {
        var result = await _stringTemplateService.UpdateStringTemplate(updateStringTemplateRO.Id,
            updateStringTemplateRO.TemplateName, updateStringTemplateRO.StringTemplateObject);
        return ResultModel.Ok(result);
    }

    [HttpPost]
    public async Task<ResultModel<bool>> DeleteStringTemplates(List<int> roomIdList)
    {
        var result = await _stringTemplateService.DeleteStringTemplates(roomIdList);
        return ResultModel.Ok(result);
    }

    /// <summary>
    ///     重置系统模板
    /// </summary>
    /// <returns></returns>
    [Authorize(Roles = nameof(RoleType.Admin))]
    [HttpGet]
    public async Task<ResultModel<string>> ResetSystemStringTemplates()
    {
        var result = await _stringTemplateService.ResetSystemStringTemplates();
        return result ? ResultModel.Ok("重置系统模板成功") : ResultModel.Error("重置失败", string.Empty);
    }
}
