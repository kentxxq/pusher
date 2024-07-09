using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using pusher.webapi.Enums;
using pusher.webapi.Options;

namespace pusher.webapi.Controllers;

[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class TestController : ControllerBase
{
    private readonly IOptionsMonitor<DataOptions> _dataOptions;
    private readonly ILogger<UserController> _logger;

    public TestController(ILogger<UserController> logger, IOptionsMonitor<DataOptions> dataOptions)
    {
        _logger = logger;
        _dataOptions = dataOptions;
    }

    [AllowAnonymous]
    [HttpGet]
    public string TestAnyone()
    {
        _logger.LogInformation("anyone");
        _logger.LogInformation("1");
        _logger.LogInformation($"{_dataOptions.CurrentValue.MessageRetentionPeriod}");
        _logger.LogInformation("2");
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
