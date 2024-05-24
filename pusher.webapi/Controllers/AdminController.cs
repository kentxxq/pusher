using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using pusher.webapi.Service;
using pusher.webapi.Service.Database;

namespace pusher.webapi.Controllers;

/// <summary>
///     管理员接口
/// </summary>
[Authorize(Roles = nameof(RoleType.Admin))]
[ApiExplorerSettings(GroupName = "v1")]
[ApiController]
[Route("[controller]/[action]")]
public class AdminController : ControllerBase
{
    private readonly DBService _dbService;
    private readonly UserService _userService;

    public AdminController(DBService dbService, UserService userService)
    {
        _dbService = dbService;
        _userService = userService;
    }

    /// <summary>
    ///     重置数据库
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<string>> ResetDatabase()
    {
        _dbService.ResetDatabase();
        var userId = await _dbService.CreateAdminUser();
        await _userService.InitUserData(userId);
        var result = await _dbService.ResetSystemStringTemplates();
        return result ? ResultModel.Ok("重置系统模板成功") : ResultModel.Error("重置失败", string.Empty);
    }

    /// <summary>
    ///     重置系统模板
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<string>> ResetSystemStringTemplates()
    {
        var result = await _dbService.ResetSystemStringTemplates();
        return result ? ResultModel.Ok("重置系统模板成功") : ResultModel.Error("重置失败", string.Empty);
    }

    /// <summary>
    ///     获取所有用户
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ResultModel<List<User>>> GetUsers()
    {
        return ResultModel.Ok(await _userService.GetUsers());
    }

    /// <summary>
    ///     修改用户角色
    /// </summary>
    /// <param name="updateUserRoleRO"></param>
    /// <returns></returns>
    /// <exception cref="PusherException"></exception>
    [HttpPost]
    public async Task<ResultModel<string>> UpdateUserRole(UpdateUserRoleRO updateUserRoleRO)
    {
        var user = await _userService.GetUserByUsername(updateUserRoleRO.Username);
        if (user is null)
        {
            throw new PusherException("用户不存在");
        }

        user.RoleType = updateUserRoleRO.RoleType;
        return ResultModel.Ok(await _userService.UpdateUser(user) ? "修改成功" : "修改失败");
    }

    /// <summary>
    ///     创建用户
    /// </summary>
    /// <param name="createUserRO"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> CreateUser(CreateUserRO createUserRO)
    {
        var userId = await _userService.CreateUser(createUserRO.Username, createUserRO.Password,
            createUserRO.RoleType);
        await _userService.InitUserData(userId);
        return ResultModel.Ok(userId);
    }

    /// <summary>
    ///     删除用户
    /// </summary>
    /// <param name="deleteIdList"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ResultModel<int>> DeleteUser(List<int> deleteIdList)
    {
        var count = await _userService.DeleteUser(deleteIdList);
        return ResultModel.Ok(count);
    }
}
