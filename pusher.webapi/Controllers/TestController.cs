using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Enums;

namespace pusher.webapi.Controllers;

[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class TestController : ControllerBase
{
    private readonly ILogger<UserController> _logger;

    public TestController(ILogger<UserController> logger)
    {
        _logger = logger;
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
}
