using EmailValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Extensions;
using pusher.webapi.Models.RO;
using pusher.webapi.Models.SO;
using pusher.webapi.Service;

namespace pusher.webapi.Controllers;

/// <summary>用户相关</summary>
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class UserController : ControllerBase
{
    private readonly EmailService _emailService;
    private readonly JWTService _jwtService;
    private readonly ILogger<UserController> _logger;
    private readonly UserService _userService;

    /// <inheritdoc />
    public UserController(ILogger<UserController> logger, JWTService jwtService, UserService userService,
        EmailService emailService)
    {
        _logger = logger;
        _jwtService = jwtService;
        _userService = userService;
        _emailService = emailService;
    }

    /// <summary>
    ///     登录
    /// </summary>
    /// <param name="loginRO"></param>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpPost]
    public async Task<ResultModel<LoginSO>> Login(LoginRO loginRO)
    {
        var token = await _userService.Login(loginRO.Username, loginRO.Password);
        return ResultModel.Ok(new LoginSO { Token = token });
    }

    /// <summary>
    ///     刷新token
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<LoginSO>> RefreshToken()
    {
        var user = await _userService.GetUserByUsername(HttpContext.GetUsername());
        var token = _jwtService.GetToken(user.Id, user.Username, [user.RoleType.ToStringFast()]);
        return ResultModel.Ok(new LoginSO { Token = token });
    }

    /// <summary>
    ///     修改密码
    /// </summary>
    /// <param name="updatePasswordRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<string>> UpdatePassword(UpdatePasswordRO updatePasswordRO)
    {
        var username = HttpContext.GetUsername();
        var result =
            await _userService.ChangePassword(username, updatePasswordRO.OldPassword, updatePasswordRO.NewPassword);
        if (result)
        {
            return ResultModel.Ok("修改成功");
        }

        return ResultModel.Error("信息有误,修改失败", username);
    }


    /// <summary>
    ///     用户注册/忘记密码
    /// </summary>
    /// <param name="username"></param>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ResultModel<string>> GetPassword(string username)
    {
        var user = await _userService.GetUserByUsername(username);
        if (!EmailValidator.Validate(username))
        {
            return ResultModel.Error("非法邮箱地址", username);
        }

        string password;
        if (user is null)
        {
            password = RandomString.GetRandomString(8, true, true, true);
            await _userService.CreateUser(username, password, RoleType.Free);
        }
        else
        {
            // 10分钟只允许发送一封邮件
            if (user.LastForgetTime is null || DateTimeOffset.Now - user.LastForgetTime > TimeSpan.FromMinutes(10))
            {
                password = user.Password;
                user.LastForgetTime = DateTimeOffset.Now;
                await _userService.UpdateUser(user);
            }
            else
            {
                return ResultModel.Error("10分钟内只允许发送一封邮件", username);
            }
        }

        await _emailService.SendAsync(username, "pusher-用户注册", $"欢迎注册pusher,你的用户名是{username},你的密码是{password}");
        return ResultModel.Ok($"已发送邮件到{username}");
    }
}
