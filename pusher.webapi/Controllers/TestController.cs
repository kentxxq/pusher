using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Service;
using SqlSugar;

namespace pusher.webapi.Controllers;

[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class TestController : ControllerBase
{
    private readonly ILogger<UserController> _logger;
    private readonly ISqlSugarClient _sqlSugarClient;
    private readonly UserService _userService;

    public TestController(ILogger<UserController> logger, ISqlSugarClient sqlSugarClient, UserService userService)
    {
        _logger = logger;
        _sqlSugarClient = sqlSugarClient;
        _userService = userService;
    }

    [AllowAnonymous]
    [HttpGet]
    public string TestAnyone()
    {
        _logger.LogInformation("anyone");
        return "anyone";
    }

    [Authorize(Roles = "free")]
    [HttpGet]
    public string TestFree()
    {
        return "free";
    }

    [Authorize(Roles = nameof(RoleType.Admin))]
    [HttpGet]
    public string TestAdmin()
    {
        return "admin";
    }

    [Authorize(Roles = nameof(RoleType.Admin))]
    [HttpGet]
    public async Task<string> ResetDatabase()
    {
        DatabaseUtils.ResetDatabase(_sqlSugarClient);
        var userId = await DatabaseUtils.CreateAdminUser(_sqlSugarClient);
        await _userService.InitUserData(userId);
        return "重置成功";
    }
}
