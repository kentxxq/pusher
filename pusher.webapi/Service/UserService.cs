using pusher.webapi.Common;
using pusher.webapi.Enums;
using pusher.webapi.Models.DB;
using pusher.webapi.Service.Database;
using SqlSugar;

namespace pusher.webapi.Service;

public class UserService
{
    private readonly JWTService _jwtService;
    private readonly ILogger<UserService> _logger;
    private readonly Repository<Channel> _repChannel;
    private readonly Repository<ChannelMessageHistory> _repChannelMessageHistory;
    private readonly Repository<Message> _repMessage;
    private readonly Repository<Room> _repRoom;
    private readonly Repository<RoomWithChannel> _repRoomWithChannel;
    private readonly Repository<StringTemplate> _repStringTemplate;
    private readonly Repository<User> _repUser;

    public UserService(Repository<User> repUser, ILogger<UserService> logger, Repository<Room> repRoom,
        Repository<Channel> repChannel, Repository<StringTemplate> repStringTemplate,
        Repository<RoomWithChannel> repRoomWithChannel, JWTService jwtService,
        Repository<ChannelMessageHistory> repChannelMessageHistory, Repository<Message> repMessage)
    {
        _repUser = repUser;
        _logger = logger;
        _repRoom = repRoom;
        _repChannel = repChannel;
        _repStringTemplate = repStringTemplate;
        _repRoomWithChannel = repRoomWithChannel;
        _jwtService = jwtService;
        _repChannelMessageHistory = repChannelMessageHistory;
        _repMessage = repMessage;
    }

    /// <summary>
    ///     登录
    /// </summary>
    /// <param name="username"></param>
    /// <param name="password"></param>
    /// <returns></returns>
    public async Task<string> Login(string username, string password)
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == username && u.Password == password);
        if (user is null)
        {
            throw new PusherException("用户名或密码错误");
        }

        _logger.LogInformation("用户{username}登录成功", username);

        user.LastLoginTime = DateTime.Now;
        await _repUser.UpdateAsync(user);
        var token = _jwtService.GetToken(user.Id, user.Username, [user.RoleType.ToStringFast()]);
        return token;
    }

    /// <summary>
    ///     获取用户角色
    /// </summary>
    /// <param name="username"></param>
    /// <returns></returns>
    public async Task<string> GetUserRole(string username)
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == username);
        return user is not null ? user.RoleType.ToStringFast() : string.Empty;
    }

    /// <summary>
    ///     修改密码
    /// </summary>
    /// <param name="username"></param>
    /// <param name="oldPassword"></param>
    /// <param name="newPassword"></param>
    /// <returns></returns>
    public async Task<bool> ChangePassword(string username, string oldPassword, string newPassword)
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == username);
        if (user?.Password != oldPassword)
        {
            return false;
        }

        user.Password = newPassword;
        return await _repUser.UpdateAsync(user);
    }

    public async Task<int> CreateUser(string username, string password, RoleType roleType)
    {
        var tmp = await _repUser.GetFirstAsync(u => u.Username == username);
        if (tmp is not null)
        {
            throw new PusherException($"用户{username}已经存在");
        }

        var user = new User
        {
            Username = username,
            Password = password,
            RoleType = roleType
        };
        return await _repUser.InsertReturnIdentityAsync(user);
    }

    /// <summary>
    ///     第一次逻辑删除,第二次级联删除
    /// </summary>
    /// <param name="userIdList"></param>
    /// <returns></returns>
    public async Task<int> DeleteUser(List<int> userIdList)
    {
        var deleteCount = 0;
        foreach (var userId in userIdList)
        {
            var user = await _repUser.GetByIdAsync(userId);
            if (user is null)
            {
                continue;
            }

            // 如果已经删除过一次,那么就级联删除所有内容
            if (user.Username.StartsWith("delete_"))
            {
                if (await DeleteUserCascade([userId]))
                {
                    deleteCount += 1;
                }
            }
            else
            {
                // 逻辑删除
                user.Username = "delete_" + user.Username;
                if (await _repUser.UpdateAsync(user))
                {
                    deleteCount += 1;
                }
            }
        }

        return deleteCount;
    }

    /// <summary>
    ///     删除用户,包括用户数据
    /// </summary>
    /// <param name="userIdList"></param>
    /// <returns></returns>
    public async Task<bool> DeleteUserCascade(List<int> userIdList)
    {
        foreach (var userId in userIdList)
        {
            // 删除相关的内容
            await DeleteUserData(userId);
        }

        return await _repUser.DeleteByIdsAsync(userIdList.Cast<object>().ToArray());
    }

    /// <summary>
    ///     删除用户的所有数据(不包含User表信息)
    /// </summary>
    /// <param name="userId"></param>
    public async Task DeleteUserData(int userId)
    {
        var rooms = await _repRoom.GetListAsync(r => r.UserId == userId) ?? [];
        await _repRoom.DeleteByIdsAsync(rooms.Select(r => r.Id).Cast<object>().ToArray());
        await _repRoomWithChannel.DeleteAsync(r => rooms.Select(r => r.Id).Contains(r.RoomId));
        await _repMessage.DeleteAsync(m => rooms.Select(r => r.Id).Contains(m.RoomId));

        var channels = await _repChannel.GetListAsync(c => c.UserId == userId);
        await _repChannel.DeleteByIdsAsync(channels.Select(r => r.Id).Cast<object>().ToArray());
        await _repChannelMessageHistory.DeleteAsync(h => channels.Select(c => c.Id).Contains(h.ChannelId));

        var stringTemplates = await _repStringTemplate.GetListAsync(t => t.UserId == userId);
        await _repStringTemplate.DeleteByIdsAsync(stringTemplates.Select(t => t.Id).Cast<object>().ToArray());
    }

    public async Task<PageDataModel<User>> GetUsersWithPage(int pageIndex, int pageSize)
    {
        var p = StaticTools.CreatePageModel(pageIndex, pageSize);
        var data = await _repUser.GetPageListAsync(r => true, p, r => r.Id, OrderByType.Asc) ?? [];
        return PageDataModel.Ok(data, p);
    }

    public async Task<List<User>> GetUsers()
    {
        var data = await _repUser.GetListAsync() ?? [];
        return data;
    }

    public async Task<bool> UpdateUser(User user)
    {
        return await _repUser.UpdateAsync(user);
    }

    public async Task<User?> GetUserByUsername(string username)
    {
        var user = await _repUser.GetFirstAsync(u => u.Username == username);
        return user;
    }

    /// <summary>
    ///     示例用户数据. 创建room,channel,stringTemplate
    /// </summary>
    /// <param name="userId"></param>
    public async Task<bool> InitUserData(int userId)
    {
        _logger.LogInformation("开始初始化用户id为{UserId}的数据", userId);
        var demoRoom = new Room
        {
            RoomName = "示例-房间名",
            RoomCode = Guid.NewGuid().ToString("D"),
            CreateDate = DateTime.Now,
            UserId = userId
        };
        var roomId = await _repRoom.InsertReturnIdentityAsync(demoRoom);
        _logger.LogInformation("新增房间成功,id:{RoomId}", roomId);

        var demoChannel = new Channel
        {
            ChannelName = "示例-飞书",
            ChannelType = ChannelEnum.Lark,
            ChannelUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/你的key",
            UserId = userId
        };
        var channelId = await _repChannel.InsertReturnIdentityAsync(demoChannel);
        _logger.LogInformation("新增渠道成功:{ChannelId}", channelId);

        var demoRoomWithChannel = new List<RoomWithChannel>
        {
            new() { RoomId = roomId, ChannelId = channelId }
        };
        await _repRoomWithChannel.InsertRangeAsync(demoRoomWithChannel);
        _logger.LogInformation("新增{Count}个房间与渠道关系成功", demoRoomWithChannel.Count);

        var demoStringTemplate = new List<StringTemplate>
        {
            new()
            {
                UserId = userId,
                TemplateName = "示例模板-测试",
                TemplateCode = Guid.NewGuid().ToString("D"),
                StringTemplateObject = new StringTemplateObject
                {
                    Variables = [new TemplateParseObject { VariableName = "a", JsonPath = "$.b" }],
                    TemplateText = """
                                   haha
                                   {{ a }}
                                   heihei
                                   """
                }
            }
        };
        await _repStringTemplate.InsertRangeAsync(demoStringTemplate);
        _logger.LogInformation("新增{Count}个模板成功", demoStringTemplate.Count);
        return true;
    }
}
