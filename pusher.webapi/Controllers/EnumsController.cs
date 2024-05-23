using Microsoft.AspNetCore.Mvc;
using MyReflection;
using pusher.webapi.Common;
using pusher.webapi.SO;

namespace pusher.webapi.Controllers;

[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class EnumsController : ControllerBase
{
    private readonly ILogger<EnumsController> _logger;

    public EnumsController(ILogger<EnumsController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public ResultModel<List<EnumObject>> ResultStatusApi()
    {
        // var data = typeof(ResultStatus).EnumToEnumObject<ResultStatus>();
        var data = ResultStatus.Success.EnumToEnumObject2();
        return ResultModel.Ok(data);
    }

    [HttpGet]
    public ResultModel<List<EnumObject>> ChannelEnumApi()
    {
        var data = ChannelEnum.Lark.EnumToEnumObject2();
        return ResultModel.Ok(data);
    }

    [HttpGet]
    public ResultModel<List<EnumObject>> RoleEnumApi()
    {
        var data = RoleType.Free.EnumToEnumObject2();
        return ResultModel.Ok(data);
    }
}
