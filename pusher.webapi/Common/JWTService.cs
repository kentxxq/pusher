namespace pusher.webapi.Common;

/// <summary>
///     JWT工具
/// </summary>
public class JWTService
{
    private readonly IConfiguration _configuration;

    /// <summary>
    ///     构造函数
    /// </summary>
    /// <param name="configuration"></param>
    public JWTService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    ///     获取token
    /// </summary>
    /// <param name="username">用户名</param>
    /// <returns></returns>
    public string GetToken(int userId, string username, List<string> roleType)
    {
        // var secret = "";
        // var issuer = _configuration.GetValue<string>($"Authentication:Schemes:{schemaName}:ValidIssuer");
        // var signingKey = _configuration.GetSection($"Authentication:Schemes:{schemaName}:SigningKeys")
        //     .GetChildren()
        //     .SingleOrDefault(key => key["Issuer"] == issuer);
        // if (signingKey?["Value"] is { } keyValue)
        // {
        //     secret = keyValue;
        // }
        var issuer = _configuration["JWT:Issuer"];
        var audience = _configuration["JWT:Audience"];
        var secret = _configuration["JWT:Key"];
        var expireDay = _configuration.GetValue("JWT:ExpireDay", 1);
        if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
        {
            throw new Exception("jwt没有完成配置");
        }

        return JWTool.CreateTokenString(userId, username, roleType, secret, DateTime.Now.AddDays(expireDay), issuer,
            audience);
    }
}
