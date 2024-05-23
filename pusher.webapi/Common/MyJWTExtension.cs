using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace pusher.webapi.Common;

/// <summary>
///     jwt配置-拓展方法
/// </summary>
public static class MyJWTExtension
{
    /// <summary>
    ///     添加jwt配置
    /// </summary>
    /// <param name="builder"></param>
    /// <returns></returns>
    public static void AddMyJWT(this WebApplicationBuilder builder)
    {
        builder.Services.AddAuthentication(x =>
            {
                x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            }) // 这里是设置默认认证方案。controller没有配置方案的时候，使用Bearer认证
            .AddJwtBearer(x =>
            {
                x.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = builder.Configuration["JWT:Issuer"],
                    ValidAudience = builder.Configuration["JWT:Audience"],
                    IssuerSigningKey =
                        new SymmetricSecurityKey(Convert.FromBase64String(builder.Configuration["JWT:Key"])),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true
                };
            }); // 这里是添加认证方案。等同于AddJwtBearer("Bearer")

        builder.Services.AddAuthorization(options =>
        {
            // 角色不能满足，或多种条件组合的时候。采用自定义
            // dotnet user-jwts create  --claim is_allow=true --claim ken=ken_allow --role admin --role superadmin --audience dotnet-user-jwts
            options.AddPolicy("is_allow", policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireClaim("is_allow", "true");
                // 多种claim条件组合
                policy.RequireAssertion(context =>
                {
                    return context.User.HasClaim(c =>
                        c.Type == "ken" && (c.Value == "ken_allow" || c.Value == "admin_allow"));
                });
            });
        });
    }
}
